import { execFileSync, spawn } from "node:child_process";
import { readFile, writeFile, open } from "node:fs/promises";
import { existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { setTimeout as pause } from "node:timers/promises";
import { waitForExampleSchema } from "./example-schema.mjs";
const cwd = new URL("../", import.meta.url);
process.chdir(fileURLToPath(cwd));
const cli = fileURLToPath(
  new URL("../node_modules/supabase/dist/supabase.js", import.meta.url),
);
const env = {
  ...process.env,
  SUPABASE_INTERNAL_IMAGE_REGISTRY:
    process.env.SUPABASE_INTERNAL_IMAGE_REGISTRY || "docker.io",
};
const envPath = ".env.local",
  accountPath = ".bloggr-example.json";
let stage = "startup";
try {
  if (
    existsSync(envPath) &&
    !(await readFile(envPath, "utf8")).startsWith("# Bloggr local example")
  )
    throw new Error(
      "An existing .env.local is present. Preserve it and use a separate checkout for the local example.",
    );
  if (!process.argv.includes("--existing")) {
    const log = await open(".bloggr-example.log", "a", 0o600);
    try {
      execFileSync(
        process.execPath,
        [
          cli,
          "start",
          ...(process.env.BLOGGR_EXAMPLE_EXTERNAL_HEALTHCHECKS === "1"
            ? ["--ignore-health-check"]
            : []),
          "-x",
          "realtime,imgproxy,postgres-meta,studio,edge-runtime,logflare,vector,supavisor",
        ],
        { env, stdio: ["ignore", log.fd, log.fd] },
      );
    } catch {
      throw new Error(
        "Local Supabase did not start. Check Docker and the ignored .bloggr-example.log; credential output is kept out of the console.",
      );
    } finally {
      await log.close();
    }
  }
  const raw = execFileSync(process.execPath, [cli, "status", "-o", "env"], {
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const values = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m)
      try {
        values[m[1]] = JSON.parse(m[2]);
      } catch {
        values[m[1]] = m[2];
      }
  }
  const url = values.API_URL,
    key = values.SERVICE_ROLE_KEY || values.SECRET_KEY,
    anon = values.ANON_KEY || values.PUBLISHABLE_KEY;
  if (!url || !key || !anon || !values.DB_URL)
    throw new Error("The local backend did not report all required settings.");
  if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
    throw new Error("The example backend must use loopback.");
  const origin = "http://127.0.0.1:3000";
  const parsed = new URL(origin);
  if (!["127.0.0.1", "localhost"].includes(parsed.hostname))
    throw new Error("Example origin must use loopback.");
  let accounts = existsSync(accountPath)
    ? JSON.parse(await readFile(accountPath, "utf8"))
    : null;
  if (!accounts)
    accounts = Object.fromEntries(
      ["owner", "editor", "author", "outsider"].map((role) => [
        role,
        {
          email: role + "@bloggr.local",
          password: randomBytes(24).toString("base64url"),
        },
      ]),
    );
  await writeFile(accountPath, JSON.stringify(accounts, null, 2) + "\n", {
    mode: 0o600,
  });
  const config = {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: key,
    DATABASE_URL: values.DB_URL,
    ADMIN_ALLOWED_EMAIL: accounts.owner.email,
    NEXT_PUBLIC_SITE_URL: origin,
    NEXT_TELEMETRY_DISABLED: "1",
    BLOGGR_LOCAL_EXAMPLE: "1",
  };
  await writeFile(
    envPath,
    "# Bloggr local example: generated, never commit\n" +
      Object.entries(config)
        .map(([n, v]) => n + "=" + JSON.stringify(v))
        .join("\n") +
      "\n",
    { mode: 0o600 },
  );
  execFileSync(process.execPath, ["scripts/migrate.mjs"], {
    env: { ...env, ...config },
    stdio: "inherit",
  });
  stage = "auth users";
  const db = createClient(url, key, { auth: { persistSession: false } });
  for (let attempt = 0; attempt < 60; attempt++) {
    let healthy = false;
    try {
      healthy = (
        await fetch(url + "/auth/v1/health", { headers: { apikey: anon } })
      ).ok;
    } catch {}
    if (healthy) break;
    if (attempt === 59)
      throw new Error("Local authentication did not become ready.");
    await pause(250);
  }
  for (let attempt = 0; attempt < 60; attempt++) {
    const result = await db.storage.listBuckets();
    if (!result.error) break;
    if (attempt === 59) throw new Error("Local storage did not become ready.");
    await pause(250);
  }

  stage = "REST schema readiness";
  await waitForExampleSchema(db);
  stage = "auth users";
  const { data: existing, error: usersError } = await db.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });
  if (usersError) throw usersError;
  for (const [role, account] of Object.entries(accounts)) {
    let user = existing.users.find((u) => u.email === account.email);
    stage = "create local " + role;
    if (!user) {
      const { data, error } = await db.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
      });
      if (error) throw error;
      user = data.user;
    }
    account.id = user.id;
    stage = "local membership " + role;
    if (role === "editor" || role === "author") {
      const { error } = await db
        .from("blog_members")
        .upsert(
          { user_id: user.id, role },
          { onConflict: "user_id", ignoreDuplicates: true },
        );
      if (error) throw error;
    }
    stage = "local profile " + role;
    if (role !== "outsider") {
      const { error } = await db.from("blog_author_profiles").upsert(
        {
          user_id: user.id,
          slug: role,
          display_name:
            role === "owner"
              ? "Alex Morgan"
              : role === "editor"
                ? "Sam Editor"
                : "Jamie Writer",
          bio: "A contributor to this local Bloggr example.",
          avatar_url: "",
        },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
      if (error) throw error;
    }
  }
  await writeFile(accountPath, JSON.stringify(accounts, null, 2) + "\n", {
    mode: 0o600,
  });
  stage = "sample media";
  const image = await sharp(
    Buffer.from(
      '<svg width="1200" height="750" xmlns="http://www.w3.org/2000/svg"><rect width="1200" height="750" fill="#e9efe6"/><circle cx="920" cy="100" r="360" fill="#245d48"/><path d="M0 650Q300 150 650 650T1300 550V750H0" fill="#9cb697"/></svg>',
    ),
  )
    .webp()
    .toBuffer();
  const name = "example-cover.webp";
  const { error: uploadError } = await db.storage
    .from("blog-images")
    .upload(name, image, { contentType: "image/webp", upsert: true });
  if (uploadError) throw uploadError;
  const cover = db.storage.from("blog-images").getPublicUrl(name)
    .data.publicUrl;
  const { error: mediaError } = await db.from("blog_media").upsert({
    name,
    created_by: accounts.owner.id,
    alt: "Abstract green landscape",
    caption: "A little space for new ideas.",
    width: 1200,
    height: 750,
    byte_size: image.length,
  });
  if (mediaError) throw mediaError;
  const samples = [
    [
      "11111111-1111-4111-8111-111111111101",
      "welcome-to-bloggr",
      "Welcome to your Bloggr example",
      "A working local publication, ready for your own stories.",
    ],
    [
      "11111111-1111-4111-8111-111111111102",
      "a-better-writing-routine",
      "A better writing routine for busy people",
      "Small changes that make it easier to begin.",
    ],
    [
      "11111111-1111-4111-8111-111111111103",
      "notes-from-an-afternoon",
      "Notes from an ordinary afternoon",
      "A walk, a notebook, and the things we almost missed.",
    ],
  ];
  stage = "sample stories";
  for (const [id, slug, title, excerpt] of samples) {
    const { data: found } = await db
      .from("blog_posts")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (found) continue;
    const draft = {
      title,
      excerpt,
      htmlContent:
        "<p>" +
        excerpt +
        "</p><h2>Make room for ideas</h2><p>Keep a notebook close by. Write down the things you notice and the questions you want to answer.</p><h2>Start small</h2><p>You do not need a perfect first draft to make progress. Try writing one honest paragraph.</p><h2>Keep going</h2><p>Return when you have a little time, and build on what you started.</p>",
      date: "2026-01-01T12:00:00Z",
      seoDescription: excerpt,
      seoKeywords: "writing,ideas",
      coverImage: cover,
      coverAlt: "Abstract green landscape",
      coverCaption: "A little space for new ideas.",
      tags: ["Writing"],
      authorName: "Alex Morgan",
    };
    const params = {
      p_slug: slug,
      p_draft: draft,
      p_action: "create",
      p_version: null,
      p_id: id,
      p_revision: null,
      p_actor_id: accounts.owner.id,
      p_actor_role: "owner",
      p_new_slug: null,
    };
    const { data, error } = await db.rpc("edit_blog_post", params);
    if (error) throw error;
    const published = await db.rpc("edit_blog_post", {
      ...params,
      p_action: "publish",
      p_version: data.version,
    });
    if (published.error) throw published.error;
  }
  console.log(
    "Local example prepared. Credentials are in ignored .bloggr-example.json; application settings are in ignored .env.local.",
  );
  if (process.argv.includes("--start")) {
    const child = spawn(
      process.execPath,
      [
        process.env.npm_execpath,
        "run",
        "dev",
        "--",
        "--hostname",
        "127.0.0.1",
        "--port",
        "3000",
      ],
      { env: { ...process.env, ...config }, stdio: "inherit" },
    );
    child.on("exit", (code) => process.exit(code || 0));
  }
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Example setup failed at " +
          stage +
          " (code " +
          String(error?.code || error?.status || "unknown") +
          ").",
  );
  process.exitCode = 1;
}
