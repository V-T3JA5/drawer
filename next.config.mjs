/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',        // Builds to plain static HTML/CSS/JS — no server needed to run this site
  images: {
    unoptimized: true,     // Static export can't use Next's image-optimization server; plain <img> behavior instead
  },
};

export default nextConfig;
