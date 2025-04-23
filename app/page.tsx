"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ToastContainer } from "react-toastify";
import Script from "next/script";
import "react-toastify/dist/ReactToastify.css";




export default function SignupPage() {
  // Existing state variables.
  const [isDark, setIsDark] = useState(true);
  
  
  const [showBlogTooltip, setShowBlogTooltip] = useState(false);

  // Apply dark mode immediately via body class.
  useEffect(() => {
    document.body.classList.toggle("dark-mode", isDark);
  }, [isDark]);

  

 

  // Toggle dark/light theme.
  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  
  

  return (
    <>
      {/* Load GSAP TweenMax for backward compatibility */}
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/gsap/1.20.4/TweenMax.min.js"
        strategy="beforeInteractive"
      />

      {/* Top-left container: Blog Icon */}
      <div
  style={{
    position: "fixed",
    top: "1rem",
    left: "1rem",
    display: "flex",
    alignItems: "center",
    zIndex: 1000,
    color: isDark ? "#FFF" : "#333",
  }}
>
  <div
    className="blog-icon-container"
    onMouseEnter={() => setShowBlogTooltip(true)}
    onMouseLeave={() => setShowBlogTooltip(false)}
    style={{ position: "relative", display: "inline-block" }}
  >
    <Link
      href="/blog"
      aria-label="Go to Blog"
      style={{ display: "block", padding: "4px" }}
    >
      <svg
        version="1.1"
        id="Layer_1"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        viewBox="0 0 512 512"
        xmlSpace="preserve"
        fill="currentColor"
        width="32"
        height="32"
        style={{ display: "block" }}
      >
              <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
              <g
                id="SVGRepo_tracerCarrier"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></g>
              <g id="SVGRepo_iconCarrier">
                <circle style={{ fill: "#3A99D7" }} cx="256" cy="255.997" r="255.997" />
                <path
                  style={{ fill: "#2682BF" }}
                  d="M506.485,309.123C482.052,424.985,379.116,512,256.002,512c-3.153,0-6.306,0-9.458-0.158L133.835,399.133l222.897-239.605L506.485,309.28V309.123z"
                />
                <path style={{ fill: "#F7F7F8" }} d="M133.835,113.025h176.395l46.503,46.503v239.605H133.835V113.025z" />
                <path style={{ fill: "#CCCCCC" }} d="M310.229,113.025v46.503h46.503L310.229,113.025z" />
                <g>
                  <rect x="166.305" y="175.768" style={{ fill: "#E84F4F" }} width="150.222" height="14.345" />
                  <rect x="166.305" y="202.405" style={{ fill: "#E84F4F" }} width="150.222" height="14.345" />
                  <rect x="166.305" y="228.891" style={{ fill: "#E84F4F" }} width="150.222" height="14.345" />
                  <rect x="166.305" y="255.367" style={{ fill: "#E84F4F" }} width="150.222" height="14.345" />
                  <rect x="166.305" y="282.013" style={{ fill: "#E84F4F" }} width="115.071" height="14.345" />
                  <polygon style={{ fill: "#E84F4F" }} points="370.494,232.194 403.311,263.364 318.097,352.818 285.281,321.647" />
                </g>
                <path style={{ fill: "#FFF094" }} d="M285.323,321.576l32.788,31.212l-32.788,14.503l-12.769-12.137L285.323,321.576z" />
                <path style={{ fill: "#F0DD85" }} d="M301.559,337.182l16.552,15.606l-32.788,14.503l-6.463-6.148l22.857-23.961L301.559,337.182L301.559,337.182z" />
                <path style={{ fill: "#00CC96" }} d="M396.14,221.32l17.183,16.236c4.414,4.257,3.468,12.296-1.891,18.128l-7.567,7.882l-0.158,0.158l-33.103-31.527l0.158-0.158l7.567-7.882c5.517-5.674,13.556-7.093,17.97-2.838L396.14,221.32L396.14,221.32z" />
                <path style={{ fill: "#12B589" }} d="M404.652,229.359l8.67,8.197c4.414,4.257,3.468,12.296-1.891,18.128l-7.567,7.882l-0.158,0.158l-16.709-15.764l17.655-18.443V229.359z" />
                <path style={{ fill: "#9D9E9E" }} d="M285.323,367.291l-23.015,11.192l10.088-23.33l12.769,12.137h0.158V367.291z" />
                <path style={{ fill: "#727271" }} d="M285.323,367.291l-23.015,11.192l16.552-17.34L285.323,367.291z" />
              </g>
              </svg>
    </Link>
    {showBlogTooltip && (
      <div
        className="blog-tooltip"
        style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0, 0, 0, 0.75)",
          color: "#fff",
          padding: "4px 8px",
          borderRadius: "4px",
          fontSize: "0.85rem",
          boxShadow: "0 4px 8px rgba(0,0,0,0.3)",
          whiteSpace: "nowrap",
          opacity: 1,
          pointerEvents: "none",
        }}
      >
        Blog
      </div>
    )}
  </div>
</div>

      {/* Navigation / Header */}
      <header
        style={{
          position: "fixed",
          top: "0",
          width: "100%",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          zIndex: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <span
            style={{
              marginLeft: "1.5rem",
              fontSize: "1.5rem",
              fontWeight: "bold",
              color: isDark ? "#FFF" : "#333",
            }}
          >
            Bloggr&apos;s Blog
          </span>
        </div>
        <button
          onClick={toggleTheme}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            outline: "none",
          }}
          aria-label={isDark ? "Activate Light Mode" : "Activate Dark Mode"}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            {isDark ? (
              <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5s5-2.24 5-5s-2.24-5-5-5zM12 15c-1.65 0-3-1.35-3-3s1.35-3 3-3s3 1.35 3 3-1.35 3-3 3zM1 11h3v2H1zM11 1h2v3h-2zM11 20h2v3h-2zM4.22 5.64l1.42-1.42l1.41 1.41l-1.42 1.42zM16.95 18.36l1.42-1.42l1.41 1.41l-1.42 1.42zM20 11h3v2h-3zM3.51 18.36l1.41-1.41l1.42 1.42l-1.41 1.41zM16.95 5.64l1.41-1.41l1.42 1.42l-1.41 1.41z" />
            ) : (
              <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.62-.14 2.37-.36c-1.36-.78-2.37-2.17-2.37-3.79c0-2.48 2.02-4.5 4.5-4.5c1.62 0 3.01 1.01 3.79 2.37c.22-.75.36-1.54.36-2.37c0-4.97-4.03-9-9-9z" />
            )}
          </svg>
        </button>
      </header>

      {/* Main Landing Content */}
      <main
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: "6rem",
          paddingBottom: "4rem",
          textAlign: "center",
          minHeight: "100vh",
          width: "100%",
        }}
      >
        {/* Hero Section */}
<section style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
  <h1
    style={{
      fontSize: "3rem",
      marginBottom: "1rem",
      fontWeight: "bold",
      color: isDark ? "#FFF" : "#333",
    }}
  >
    Welcome to Bloggr
  </h1>
  <p
    style={{
      fontSize: "1.25rem",
      lineHeight: "1.6",
      marginBottom: "2rem",
      color: isDark ? "#DDD" : "#555",
    }}
  >
    Bloggr is an open source blog platform built for developers and tech enthusiasts.
    Seamlessly integrate it with your Next.js and Node.js projects,
    and contribute to a growing blogging platform.
  </p>

  {/* ←─ INSERTED LOGOS BEGIN ─→ */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "1.5rem",
      marginTop: "1rem",
    }}
  >
    {/* Partner logo (alpha mask) */}
    <Link
  href="https://github.com/antibody/bloggr"
  target="_blank"
  rel="noopener" 
  style={{
    display: "inline-flex",          // ← align icon and text
    alignItems: "center",
    padding: "0.75rem 1.5rem",
    /* backgroundColor: "#333",
    color: "#FFF",
    borderRadius: "4px", */
    textDecoration: "none",
    fontWeight: "bold",
  }}
>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 180 180"
      width="50"
      aria-label="Partner logo"
    >
      <mask
        id=":r8:mask0_408_134"
        maskUnits="userSpaceOnUse"
        x="0"
        y="0"
        width="180"
        height="180"
        style={{ maskType: "alpha" }}
      >
        <circle cx="90" cy="90" fill="black" r="90" />
      </mask>
      <g mask="url(#:r8:mask0_408_134)">
        <circle cx="90" cy="90" data-circle="true" fill="black" r="90" />
        <path
          d="M149.508 157.52L69.142 54H54V125.97H66.1136V69.3836L139.999 164.845C143.333 162.614 146.509 160.165 149.508 157.52Z"
          fill="url(#:r8:paint0_linear_408_134)"
        />
        <rect
          x="115"
          y="54"
          width="12"
          height="72"
          fill="url(#:r8:paint1_linear_408_134)"
        />
      </g>
      <defs>
        <linearGradient
          id=":r8:paint0_linear_408_134"
          gradientUnits="userSpaceOnUse"
          x1="109"
          y1="116.5"
          x2="144.5"
          y2="160.5"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id=":r8:paint1_linear_408_134"
          gradientUnits="userSpaceOnUse"
          x1="121"
          y1="54"
          x2="120.799"
          y2="106.875"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
    </Link>

    {/* Node.js logo (luminance mask) */}
    <Link
  href="https://github.com/antibody/bloggr"
  target="_blank"
   rel="noopener" 
  style={{
    display: "inline-flex",          // ← align icon and text
    alignItems: "center",
    padding: "0.75rem 1.5rem",
    /* backgroundColor: "#333",
    color: "#FFF",
    borderRadius: "4px", */
    textDecoration: "none",
    fontWeight: "bold",
  }}
>
    <svg width="50px" height="50px" viewBox="-2.855 0 50 50" version="1.1" xmlns="http://www.w3.org/2000/svg"  preserveAspectRatio="xMidYMid">
  <g>
    <path d="M22.145 49.907c-0.688 0 -1.33 -0.183 -1.926 -0.504l-6.098 -3.622c-0.917 -0.504 -0.458 -0.688 -0.183 -0.779 1.238 -0.413 1.467 -0.504 2.751 -1.238 0.138 -0.092 0.321 -0.046 0.458 0.046l4.677 2.797c0.183 0.092 0.413 0.092 0.55 0l18.294 -10.591c0.183 -0.092 0.275 -0.275 0.275 -0.504V14.374c0 -0.229 -0.092 -0.413 -0.275 -0.504l-18.294 -10.546c-0.183 -0.092 -0.413 -0.092 -0.55 0L3.53 13.87c-0.183 0.092 -0.275 0.321 -0.275 0.504v21.137c0 0.183 0.092 0.413 0.275 0.504l4.998 2.888c2.705 1.375 4.401 -0.229 4.401 -1.834V16.208c0 -0.275 0.229 -0.55 0.55 -0.55h2.338c0.275 0 0.55 0.229 0.55 0.55v20.862c0 3.622 -1.972 5.731 -5.41 5.731 -1.054 0 -1.88 0 -4.218 -1.146l-4.814 -2.751C0.734 38.215 0 36.932 0 35.556V14.42C0 13.044 0.734 11.761 1.926 11.073L20.22 0.481c1.146 -0.642 2.705 -0.642 3.851 0L42.365 11.073C43.557 11.76 44.291 13.044 44.291 14.42v21.137c0 1.375 -0.734 2.659 -1.926 3.347L24.071 49.495c-0.596 0.275 -1.284 0.413 -1.926 0.413m5.639 -14.534c-8.024 0 -9.674 -3.668 -9.674 -6.786 0 -0.275 0.229 -0.55 0.55 -0.55h2.384c0.275 0 0.504 0.183 0.504 0.458 0.367 2.43 1.421 3.622 6.281 3.622 3.851 0 5.502 -0.871 5.502 -2.934 0 -1.192 -0.458 -2.063 -6.465 -2.66 -4.998 -0.504 -8.115 -1.605 -8.115 -5.593 0 -3.714 3.118 -5.915 8.345 -5.915 5.869 0 8.757 2.017 9.124 6.419q0 0.206 -0.138 0.413c-0.092 0.092 -0.229 0.183 -0.367 0.183h-2.384c-0.229 0 -0.458 -0.183 -0.504 -0.413 -0.55 -2.522 -1.971 -3.347 -5.731 -3.347 -4.218 0 -4.722 1.467 -4.722 2.567 0 1.33 0.596 1.742 6.281 2.476 5.64 0.734 8.299 1.788 8.299 5.731 -0.046 4.035 -3.347 6.327 -9.17 6.327" fill="#539E43"/>
  </g>
</svg>
</Link>
  </div>
  {/* ←─ INSERTED LOGOS END ─→ */}

          
          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              justifyContent: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            {/* Contribute on GitHub with icon */}
<Link
  href="https://github.com/antibody/bloggr"
  target="_blank"
   rel="noopener" 
  style={{
    display: "inline-flex",          // ← align icon and text
    alignItems: "center",
    padding: "0.75rem 1.5rem",
    backgroundColor: "#333",
    color: "#FFF",
    borderRadius: "4px",
    textDecoration: "none",
    fontWeight: "bold",
  }}
>
<span style={{ marginLeft: "0.5rem" }}>
    Contribute on&nbsp;   
  </span>
  {/* *** NEW CODE SNIPPET: GitHub icon SVG inside Contribute button *** */}
  <svg
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
      0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13
      -.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07
      -.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08
      -.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09
      2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82
      2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01
      2.19 0 .21.15.46.55.38C13.71 14.53 16 11.54 16 8c0-4.42-3.58-8-8-8z"
    />
  </svg>
  
  {/* *** END NEW CODE SNIPPET *** */}
</Link>
            <a
              href="https://bloggr.dev/blog/build-your-own-selfhosted-blog-with-nextjs-supabase"
              target="_blank"
               rel="noopener" 
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "#217093",
                color: "#FFF",
                borderRadius: "4px",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              Documentation
            </a>
          </div>
        </section>

        {/* ***  Features Section with Semi-Translucent and Smaller Cards *** */}
        <section
          id="features"
          style={{
            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
            padding: "4rem 1rem",
            textAlign: "center",
           
          }}
        >
          <h2 style={{ fontSize: "2rem", marginBottom: "2rem" }}>Features</h2>
          <div
            style={{
              
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "2rem",
              maxWidth: "1200px",
              margin: "0 auto",
            }}
          >
            <div
              style={{
                background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                padding: "1rem",
                borderRadius: "8px",
                boxShadow: isDark
                  ? "0 4px 15px rgba(0, 0, 0, 0.3)"
                  : "0 4px 15px rgba(0,0,0,0.1)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                Seamless Next.js Integration
              </h3>
              <p style={{ margin: 0, fontSize: "1rem" }}>
                Enhance your platform with a production-ready solution built on Next.js.
              </p>
            </div>
            <div
              style={{
                background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                padding: "0.75rem",
                borderRadius: "8px",
                boxShadow: isDark
                  ? "0 4px 15px rgba(0, 0, 0, 0.3)"
                  : "0 4px 15px rgba(0,0,0,0.1)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                Powered by Supabase
              </h3>
              <p style={{ margin: 0, fontSize: "1rem" }}>
                Enjoy secure, scalable, and real-time data management with Supabase.
              </p>
            </div>
            <div
              style={{
                background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                padding: "1rem",
                borderRadius: "8px",
                boxShadow: isDark
                  ? "0 4px 15px rgba(0, 0, 0, 0.3)"
                  : "0 4px 15px rgba(0,0,0,0.1)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                Customizable &amp; Extensible
              </h3>
              <p style={{ margin: 0, fontSize: "1rem" }}>
                Tailor your blog to your unique requirements with extensive configuration options.
              </p>
            </div>
            <div
              style={{
                background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                padding: "1rem",
                borderRadius: "8px",
                boxShadow: isDark
                  ? "0 4px 15px rgba(0, 0, 0, 0.3)"
                  : "0 4px 15px rgba(0,0,0,0.1)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: "1.25rem" }}>
                Community Driven
              </h3>
              <p style={{ margin: 0, fontSize: "1rem" }}>
                Join and contribute to an active community of developers on GitHub.
              </p>
            </div>
          </div>
        </section>
        {/* *** END NEW CODE SNIPPET *** */}

       
      </main>

{/* Footer with Contribute Link */}
<footer
  style={{
    position: "relative",
    padding: "3rem 0",
    textAlign: "center",
    background: isDark ? "#111" : "#f9f9f9",
    color: isDark ? "#aaa" : "#555",
    width: "100%",
  }}
>
  {/* footer-content wrapper stacking text above icons */}
  <div
    className="footer-content"
    style={{
      display: "flex",
      flexDirection: "column",      
      alignItems: "center",
      justifyContent: "center",
      gap: "1rem",
    }}
  >
    {/* Built with… paragraph */}
    <p style={{ margin: 0 }}>
      Built with 💻 and ❤️ by the open source community.
    </p>

    {/* GitHub Icons Container  */}
    <div
      className="github-icons-container"
      style={{
        display: "flex",
        gap: "2rem",
        alignItems: "center",
        justifyContent: "center",
        color: isDark ? "#aaa" : "#555", 
      }}
    >
      <a
        href="https://github.com/Antibody/bloggr"
        target="_blank"
        rel="noopener" 
        className="github-link"
      >
        <svg
          role="img"
          viewBox="0 0 24 24"
          width="64"
          height="64"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>GitHub icon</title>
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.744.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.334-5.466-5.93 0-1.31.47-2.38 1.236-3.22-.123-.303-.536-1.523.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 013.003-.404c1.02.005 2.045.137 3.003.404 2.291-1.552 3.297-1.23 3.297-1.23.655 1.653.242 2.873.12 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.803 5.625-5.475 5.921.43.37.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.293 0 .32.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
        </svg>
        <div className="github-text">Next.js</div>
      </a>
      <a
        href="https://github.com/Antibody/bloggr"
        target="_blank"
         rel="noopener" 
        className="github-link"
      >
        <svg
          role="img"
          viewBox="0 0 24 24"
          width="64"
          height="64"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>GitHub icon</title>
          <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.744.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.762-1.605-2.665-.3-5.466-1.334-5.466-5.93 0-1.31.47-2.38 1.236-3.22-.123-.303-.536-1.523.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 013.003-.404c1.02.005 2.045.137 3.003.404 2.291-1.552 3.297-1.23 3.297-1.23.655 1.653.242 2.873.12 3.176.77.84 1.235 1.91 1.235 3.22 0 4.61-2.803 5.625-5.475 5.921.43.37.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.293 0 .32.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
        </svg>
        <div className="github-text">Node.js</div>
      </a>
    </div>
  </div>
  {/* *** END UPDATED CODE SNIPPET *** */}
</footer>



      <ToastContainer position="top-right" autoClose={5000} hideProgressBar />

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }
        html,
        body {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100%;
          font-family: "Open Sans", sans-serif;
        }
        body.dark-mode {
          color: #f0f0f0;
        }
        body:not(.dark-mode) {
          background: linear-gradient(135deg, #f0f9ff, #cbebff);
          color: #333;
        }
        ::placeholder {
          opacity: 0.7;
        }
        input:focus {
          outline: none;
        }
      `}</style>
    </>
  );
}
