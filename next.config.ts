import type { NextConfig } from "next";
// Removed MDX import: import nextMdx from '@next/mdx';

// Removed MDX configuration function:
// const withMDX = nextMdx({ ... });

const nextConfig: NextConfig = {
  /* config options here */
  pageExtensions: ['ts', 'tsx', 'js', 'jsx'], // Removed 'md' and 'mdx'
  // Optional: Enable experimental features if needed, like serverActions
  // experimental: {
  //   serverActions: true,
  // },
};

// Export the config directly without MDX wrapper
export default nextConfig;
