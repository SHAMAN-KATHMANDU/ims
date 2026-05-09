export const MOCK_DATA_CONTEXT = {
  site: {
    locale: "en-IN",
    currency: "INR",
  },
  products: [
    {
      id: "prod-1",
      name: "Wireless Headphones",
      price: "2499",
      image:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop",
    },
    {
      id: "prod-2",
      name: "Coffee Maker",
      price: "1899",
      image:
        "https://images.unsplash.com/photo-1517668808822-9ebb02ae2a0e?w=500&h=500&fit=crop",
    },
    {
      id: "prod-3",
      name: "Desk Lamp",
      price: "899",
      image:
        "https://images.unsplash.com/photo-1565636192335-14189c96b8a6?w=500&h=500&fit=crop",
    },
  ],
  categories: [
    {
      id: "cat-1",
      name: "Electronics",
      image:
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop",
    },
    {
      id: "cat-2",
      name: "Home & Garden",
      image:
        "https://images.unsplash.com/photo-1567521464027-f127ff144326?w=500&h=500&fit=crop",
    },
    {
      id: "cat-3",
      name: "Office Supplies",
      image:
        "https://images.unsplash.com/photo-1593642632759-b8e0c34df26a?w=500&h=500&fit=crop",
    },
  ],
  navPages: [
    { id: "page-1", name: "Home", slug: "/" },
    { id: "page-2", name: "Products", slug: "/products" },
    { id: "page-3", name: "About", slug: "/about" },
  ],
  blogPosts: [
    {
      id: "post-1",
      title: "Welcome to our blog",
      slug: "welcome",
      image:
        "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=500&h=300&fit=crop",
      excerpt: "Join us as we explore the latest industry trends.",
    },
    {
      id: "post-2",
      title: "Tips for modern living",
      slug: "tips-modern-living",
      image:
        "https://images.unsplash.com/photo-1552664730-d307ca884978?w=500&h=300&fit=crop",
      excerpt: "Discover practical tips to improve your daily life.",
    },
  ],
};
