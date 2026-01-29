/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'pub-cb5751e3bd7144f4a5bf8e1631aa8e20.r2.dev',
                pathname: '/**',
            },
        ],
    },
};

export default nextConfig;
