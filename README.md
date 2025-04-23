# Self-Hosted Blogging Platform

## Custom Next.js-based Blogging Application

Welcome to the Bloggr Application! This document explains what this application does, how it works, and how you can set it up and use it to run your own blog.

## Overview

This application provides a complete blog-engine solution integrated within a larger Next.js project. It allows an administrator (you!) to create, edit, and manage blog posts through a secure admin interface. Visitors can then view these posts on the public-facing blog section of the website. Current repo is built such that blog is located in `app/blog` folder and your landing page is `app/page.tsx`. 

The blog uses [Supabase](https://supabase.com/) as its backend database and for handling image uploads and user authentication (for the admin).

## Setup TL;DR

For those familiar with Next.js and Supabase, here's the quick setup guide:

1.  **Supabase Project:** Create a Supabase project.
2.  **Environment Variables (`.env.local`):** Add your Supabase Project URL and Anon Key:
    ```plaintext
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL #i.e https://YOUR_SUPABASE_URL_SUBDOMAIN.supabase.co
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
    DATABASE_URL=postgresql://postgres.[YOUR_SUPABASE_URL_SUBDOMAIN]:[YOUR-DATABASE-PASSWORD]@[YOUR-DEPLOYMENT-ZONE].pooler.supabase.com:6543/postgres
    ADMIN_ALLOWED_EMAIL=YOUR_EMAIL_FROM_SUPABASE
    TELEMETRY_SERVER_URL=https://telemetry-vercel.vercel.app/api/telemetry
    ALLOW_TELEMETRY=TRUE
    ```
3.  **Admin User:** In Supabase Auth > Users, add an admin user with an email and password. Ensure the Email provider is enabled. Disable "Confirm email" for local dev if desired. Add this email to your environment variables as:
```plaintext
    ADMIN_ALLOWED_EMAI=your-admin-email@example.com
```
4. **Database Table:** The `blog_posts` table  will be created automatically on first admin login via `/blog/api/validate`. Ensure RLS is enabled and policies allow public read (`SELECT`) and authenticated write (`INSERT`, `UPDATE`, `DELETE`).
5. **Storage Bucket for Images:** A a **public** Supabase Storage bucket named `blog-images` will be created on the first login.
6. **Clone repo:** `git clone https://github.com/Antibody/bloggr.git` then `cd bloggr`
7.  **Install deps & Run:** `npm install` then `npm run dev`.
8.  **Login:** Access blog admin page at `/blog/login` with the admin credentials created in step 2.

## Features

### 1. Public Blog View (`/blog`)

This is what your website visitors will see.

*   **Blog Post Listing:** Displays a list of your published blog posts, usually showing the most recent ones first.
*   **Blog Appearance:** is dictated, as well as that of a frontpage, by `app/globals.css`
*   **Previews:** For each post in the list, a title, a short snippet (summary) of the content, and the publication date are shown.
*   **Pagination:** If you have many posts, they are split into pages (e.g., 10 posts per page) with "Next" and "Previous" links to navigate between them.
*   **Full Post Reading:** Clicking on a post title or preview takes the visitor to a dedicated page (`/blog/[post-url-slug]`) showing the full content of that specific post.
*   **Dynamic Blog Title:** The main title on the `/blog` page (e.g., "Example's Blog" if the blog is hosted at `example.com`) can automatically adapt based on the website's domain name when deployed.
*   **SEO Friendly:** Each individual blog post page automatically includes relevant information (title, description, keywords) that helps search engines like Google understand and rank your content.

### 2. Admin Area (`/blog/admin`)

This is the secure area where you manage your blog content. You need to log in to access it.

*   **Login:** A dedicated login page (`/blog/login`) protects the admin area. Only authorized users (typically just you, the administrator) can log in.
*   **Post Management (CRUD):**
    *   **Create:** Write and publish new blog posts.
    *   **Read:** See a list of all your existing posts, including their titles, URL slugs, and publication dates.
    *   **Update:** Edit the title, content, publication date, and SEO details of existing posts.
    *   **Delete:** Permanently remove posts you no longer need.
*   **Rich Text Editor:** A user-friendly editor (powered by Tiptap) allows you to format your post content:
    *   Headings (H2, H3)
    *   Paragraphs
    *   Bold, Italic, Underline text
    *   Insert images directly into your content.
*   **Image Upload:** Easily upload images from your computer. The application handles storing these images (using Supabase Storage) and inserting them into your post. It even shows a temporary "Uploading..." message while the image is being processed.
*   **SEO Fields:** Dedicated fields allow you to specify keywords (terms people might search for) and a description (a short summary for search engines) for each post, helping improve its visibility online.
*   **Date & Time Control:** You can set the exact date and time when a post should appear as published.
*   **User Feedback:** Clear messages (toasts/popups) inform you about the success or failure of actions like saving, deleting, or uploading images.
*   **(Optional) Automatic Site Updates:** When deployed on platforms like Vercel, saving or deleting a post can automatically trigger a rebuild of your website, ensuring the latest content is live quickly.
*   **Admin Page Appearance:** is dictated, as well as that of a blog and frontpage, by `app/globals.css`

## Getting Started: Setting Up Your Blog

Follow these steps to get the blog running on your own computer or deploy it online.

### Prerequisites

1.  **Node.js:** You need Node.js installed on your computer. You can download it from [nodejs.org](https://nodejs.org/). The `npm` (Node Package Manager) is included with Node.js.
2.  **Code:** You need the codebase for this project. If you haven't already, clone or download it.
3.  **Terminal/Command Prompt:** You'll need to run commands in a terminal window.

### Step 1: Install Dependencies

Navigate to the main project directory (the one containing `package.json`) in your terminal and run:

```bash
npm install
```

This command downloads and installs all the necessary software packages the project relies on.

### Step 2: Set Up Supabase

Supabase provides the backend database, file storage, and authentication.

1.  **Create a Supabase Account:** Go to [supabase.com](https://supabase.com/) and sign up for a free account.
2.  **Create a New Project:** Once logged in, create a new project. Give it a name (e.g., "My Blog Project") and choose a strong database password (save this password securely!). Select a region close to you or your users.
3.  **Get API Keys:** After the project is created, navigate to **Project Settings** (the gear icon) > **API**. You will need two values from this page:
    *   **Project URL:** Looks like `https://<your-project-ref>.supabase.co`. Copy this.
    *   **anon public Key:** A long string of characters. Copy this. *Treat this key like a password - don't share it publicly in your code repository if it's public.*
4.  **Configure Authentication:**
    *   Go to **Authentication** (the user icon) in the left sidebar.
    *   Under **Providers**, ensure **Email** is enabled. You might want to disable "Confirm email" for easier local setup, but enable it for production deployment.
    *   Go to **Users** and click **Add user**. Create a user account for yourself (the administrator). Use a valid email address and a strong password. You will use these credentials to log into the `/blog/admin` area.
5.  **Set Up Storage for Images:**
    *   Go to **Storage** (the folder icon) in the left sidebar.
    *   Make sure `blog-images`bucket was created automatically and that RLS was enabled
    *   Make sure the bucket is set to **Public**. *This is important so visitors can see the images in your posts.*
    *   In bucket's `policies`check that `Admin Write Access for blog-images` policy exists and that it is set for your ADMIN_ALLOWED_EMAIL.
    

6.  **Database Table (`blog_posts`):**
    *   This application is designed to **automatically create the `blog_posts` table** the first time a logged-in admin visits the `/blog/admin` page if it doesn't already exist. This happens via the `/blog/api/validate` endpoint.
    *   **Manual Creation (Alternative/Verification):** If you prefer or need to verify, you can create the table manually. Go to **Table Editor** (the table icon) > **New table**.
        *   Table Name: `blog_posts`
        *   Ensure "Enable Row Level Security (RLS)" is **checked**. *This is crucial for security.*
        *   Add the following columns:
            *   `id` (int8, Primary Key, auto-generated, default: `nextval('blog_posts_id_seq'::regclass)`) - Supabase usually sets this up automatically.
            *   `created_at` (timestamptz, default: `now()`) - Supabase usually sets this up automatically.
            *   `slug` (text, **Is Unique**) - This is the URL-friendly identifier for the post (e.g., `my-first-post`).
            *   `title` (text) - The main title of the blog post.
            *   `content` (text) - The main body of the post, stored as HTML.
            *   `published_at` (timestamptz) - The date and time the post is considered published.
            *   `description` (text, **Is Nullable**) - The short description for SEO.
            *   `keywords` (text, **Is Nullable**) - Comma-separated keywords for SEO.
    *   **Row Level Security (RLS) Policies:** For security, you need RLS policies, they must be enabled automatically when the table was created. It is nevertheless a good idea to check if it was indeed so.
    *   Go to **Authentication** > **Policies**. Select the `blog_posts` table.
        *   **Enable RLS** if it's not already enabled. If it is enabled then you will see (in your table headers, on the right) **Auth policies**:
        *   Check those policies:
            *   **Allow public read access:** .
            *   **Allow admin full access:** must use your ADMIN_ALLOWED_EMAIL.

### Step 3: Configure the Application

1.  **Create `.env.local` file:** In the main project root directory (the same level as `package.json`), create a file named `.env.local`.
2.  **Add Supabase Keys:** Add the Supabase URL and Anon Key you copied earlier to this file:

    ```plaintext
    NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
    ADMIN_ALLOWED_EMAIL=YOUR_EMAIL_FROM_SUPABASE
    DATABASE_URL=postgresql://postgres.[YOUR_SUPABASE_URL_SUBDOMAIN]:[YOUR-DATABASE-PASSWORD]@[YOUR-DEPLOYMENT-ZONE].pooler.supabase.com:6543/postgres
    TELEMETRY_SERVER_URL=telemetry-vercel.vercel.app/api/telemetry
    ALLOW_TELEMETRY=TRUE
    ```

    Replace `YOUR_SUPABASE_PROJECT_URL` and `YOUR_SUPABASE_ANON_KEY` with the actual values from your Supabase project settings.

### Step 4: Run the Application Locally

1.  Open your terminal in the project root directory.
2.  Run the command:
    ```bash
    npm run dev
    ```
3.  Open your web browser and go to `http://localhost:3000`.
4.  Navigate to `/blog/login` and log in using the admin email and password you created in Supabase Auth.
5.  Navigate to `/blog/admin`. The first time you visit, it should check for and potentially create the `blog_posts` table. You can now start creating posts!
6.  Navigate to `/blog` to see the public view of your posts.

## Using the Admin Area (`/blog/admin`)

Once logged in, the admin area is split into two main sections:

*   **Left Column (Manage Posts):**
    *   Lists all your existing blog posts.
    *   Shows the title, slug (URL part), and publication date for each.
    *   Provides "Edit" and "Delete" buttons for each post.
*   **Right Column (Editor):**
    *   **Creating a New Post:** This section is ready for a new post by default.
    *   **Editing an Existing Post:** Click the "Edit" button next to a post in the left column. The right column will load that post's details.
    *   **Fields:**
        *   **Title:** The main title of your post.
        *   **Date:** Set the publication date and time (uses your local timezone for input but saves as universal time UTC).
        *   **SEO Keywords:** Enter relevant keywords separated by commas (e.g., `nextjs, supabase, blog, tutorial`).
        *   **SEO Description:** Write a short summary (around 160 characters) for search engines.
        *   **Content Editor:** Use the toolbar buttons (Bold, Italic, Underline, Headings H2/H3, Paragraph) to format your text. Click "Upload Image" to add images.
    *   **Buttons:**
        *   **Save Post / Update Post:** Saves your changes to Supabase.
        *   **Cancel Edit:** (Appears when editing) Discards changes and resets the editor form.
        *   **Clear Editor:** (Appears when creating) Clears the content editor area.

## Deployment

To make your blog accessible to everyone online, you need to deploy it.

1.  **Choose a Host:** Select a hosting provider that supports Next.js. [Vercel](https://vercel.com/) is highly recommended as it's made by the creators of Next.js and integrates well (like the optional rebuild trigger). Other options include Netlify, AWS Amplify, etc.
2.  **Connect Repository:** Link your code repository (e.g., GitHub, GitLab) to your chosen hosting provider.
3.  **Configure Build Settings:** The host usually detects Next.js automatically. 
4.  **Environment Variables:** Add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` etc... (see abpve) to the hosting provider's environment variable settings. **Important:** If you created separate Supabase projects for development and production, use the **production** keys here. Also add the `VERCEL_DEPLOY_HOOK_URL` if you want the rebuild trigger feature.
5.  **Deploy:** Trigger the deployment process through the hosting provider's interface.
6.  **Access:** Your blog will be live at the URL provided by your host (or your custom domain if you set one up).

## Key API Endpoints

These are the backend routes that the admin interface uses to interact with Supabase:

*   `/blog/api/validate`: Checks if the user is logged in as an admin and ensures the `blog_posts` table exists (creates it if not).
*   `/api/admin/posts`: Gets the list of all posts for the admin view.
*   `/api/admin/create-post`: Creates a new blog post.
*   `/api/admin/posts/[slug]`: Gets, updates (PUT), or deletes (DELETE) a specific post identified by its `slug`.
*   `/api/admin/upload-image`: Handles image uploads to Supabase Storage.

*   `middleware.ts` acts as a gatekeeper for your Next.js application, specifically protecting the /blog/admin area. It ensures that only users authenticated with Supabase and whose email matches the configured ADMIN_ALLOWED_EMAIL can access admin functionalities. It also handles session management for Supabase, ensuring users remain logged in across requests.

---

Below is an updated telemetry section that more accurately reflects how our blogging app tracks administrative actions—especially the creation and update of blog posts. This revised description focuses on the performance metrics and error reporting related to the post‐creation workflow, rather than the user signup telemetry described in the waitlist README.

---

## Telemetry Overview

Our blogging application integrates lightweight telemetry to monitor key events and errors during administrative actions such as creating and updating blog posts. This telemetry system helps ensure a smooth content management workflow by capturing performance data, detecting issues in real time, and providing detailed context when errors occur.

**Key Benefits:**

- **Error Reporting and Stability:**  
  Telemetry logs unexpected errors during the post creation or update process. When an issue occurs—whether it’s a failed save operation or an unsuccessful site rebuild trigger—the system immediately captures and relays detailed error data, allowing for prompt diagnosis and resolution.

- **Admin Activity Monitoring:**  
  By tracking events related to content publication and rebuild triggers, telemetry provides insights into how frequently posts are created or updated. This helps identify usage trends and performance bottlenecks in the content management interface.

- **Performance Metrics:**  
  Telemetry measures and records processing times (or latency) for saving and updating posts. These metrics help monitor the responsiveness of API calls and the efficiency of downstream actions, such as triggering a Vercel rebuild, so that any delays can be addressed quickly.

#### What Telemetry Sends:

- **For Successful Post Creation/Update Events:**
  - **eventType:** A string indicating the event type (e.g., `"postCreated"` or `"postUpdated"`).
  - **timestamp:** The exact time when the post was successfully saved or updated.     
  - **latency:** The time it took to process the request—from initiation to response.
  - **domain:** The domain (or environment, e.g. production) where the operation occurred.
  - **receivedAt:** When the telemetry server acknowledged receipt of the event.

- **For Error Events:**
  - **eventType:** Typically set to `"error"`.
  - **message:** A brief description of the error encountered (for instance, “Failed to save post” or “Rebuild trigger error”).
  - **details:** Technical details that could include HTTP status codes, exception messages, or context about the failed operation.
  - **postSlug:** (If applicable) the identifier of the post related to the error.
  - **domain:** The domain where the error occurred.
    
- **Example of received telemetry**
```
{
  "eventType": "blog_post_created",
  "timestamp": "2025-04-22T10:27:09.962Z",
  "domain": "bloggr.dev",
  "responseTime": 351.4814929999993,
  "supabaseTime": 346.20027900000423,
  "error": null,
  "receivedAt": "2025-04-22T10:27:10.034Z"
}
```

#### How Telemetry Sends Data:

When the admin creates or updates a blog post, the system immediately generates a telemetry event that is sent from the client-side admin interface. Upon receipt:
- The event is logged and temporarily stored in-memory on a secure telemetry server.
- An immediate email notification is triggered, containing the event’s details, so that the developer is alerted to any errors or unusual delays.
- Aggregated data is available to track performance trends over time, allowing for proactive optimization of the content management process.

#### Disabling Telemetry:

If desired, telemetry can be disabled by modifying the configuration:
- **ALLOW_TELEMETRY:**  
  Set this environment variable to `FALSE` (case-insensitive) to completely disable telemetry data collection.
- **Local Development Protection:**  
  Telemetry automatically ignores events from local development environments (e.g., `localhost` or `127.0.0.1`) so that only meaningful production data is logged.

These controls ensure that telemetry is used only when and where it’s needed, protecting privacy during development and giving full control over its collection in production.



---
Enjoy blogging!


