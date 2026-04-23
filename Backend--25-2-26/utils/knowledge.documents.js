export const HARD_CODED_KNOWLEDGE_DOCUMENTS = [
  {
    "source": "internal:shipping-policy",
    "title": "Shipping Policy",
    "content": "Shipping is free on prepaid orders above INR 499. Standard delivery takes 3 to 5 business days. Express delivery takes 1 to 2 business days in supported cities."
  },
  {
    "source": "internal:return-policy",
    "title": "Return and Refund Policy",
    "content": "Returns are accepted within 7 days of delivery for unused items in original packaging. Refunds are processed to the original payment method within 5 to 7 business days after quality checks."
  },
  {
    "source": "internal:support-hours",
    "title": "Customer Support Hours",
    "content": "Customer support is available Monday to Saturday from 10 AM to 7 PM IST through chat and email."
  },

  {
    "source": "internal:product-lighter",
    "title": "Lighter Product Information",
    "content": "Product Name: Lighter. Description: A compact and affordable utility product used for lighting cigarettes, candles, and gas stoves. Price: 10 INR. Category: Utility. Features: lightweight, portable, easy ignition, suitable for daily use. Image URL: https://res.cloudinary.com/dxkgf9d6n/image/upload/v1773947182/wiqbbtcshuntufix5tkt.webp. Product Link: http://localhost:4200/home-success/69bc4933c17377798766beaa."
  },
  {
    "source": "internal:product-cooler",
    "title": "Cooler Product Information",
    "content": "Product Name: Cooler. Description: A home appliance designed to provide cooling during hot weather, suitable for home and office use. Price: 10000 INR. Category: Home Appliances. Detailed Features:- Energy-efficient motor for low power consumption - Large water tank for extended cooling duration- Powerful air throw for medium to large rooms- Adjustable fan speed settings. Use Cases:- Ideal for summer heat- Suitable for bedrooms, living rooms, and offices Image. Benefits:- Reduces room temperature effectively - Cost-effective alternative to air conditioners. Limitations:- Requires proper ventilation - Not suitable for humid environments. Image URL: https://res.cloudinary.com/dxkgf9d6n/image/upload/v1774202184/gbslynswztbxrucaukhz.webp. Product Link: https://localhost:4200/product/69c02d49160f0dba1e392774."
  },
  {
    "source": "internal:product-speaker",
    "title": "Marshall Speaker Product Information",
    "content": "Product Name: Marshall Speaker. Description: A high-quality audio device designed for music lovers with clear sound and strong bass. Price: 5000 INR. Category: Electronics. Features: high-quality sound, strong bass, portable and stylish design. Image URL: https://res.cloudinary.com/dxkgf9d6n/image/upload/v1775035127/qzk1u8r9zfdzhlibiu2n.webp. Product Link: https://localhost:4200/product/69cce2f8fe3e96d64a686608."
  },

  {
    "source": "internal:general-rules",
    "title": "Assistant Rules",
    "content": "Only these products are available on the website: Lighter, Cooler, Marshall Speaker. If a user asks about any other product, respond that it is not available. Always provide product links only from the given data. Do not generate fake links."
  }
]

export const getHardcodedKnowledgeDocuments = () => {
    const enabled = String(process.env.AI_USE_HARDCODED_DOCS || "true").toLowerCase() === "true";
    if (!enabled) return [];

    return HARD_CODED_KNOWLEDGE_DOCUMENTS
        .map((item) => ({
            pageContent: item.content,
            metadata: {
                source: item.source,
                title: item.title,
                type: "hardcoded",
            },
        }))
        .filter((doc) => typeof doc.pageContent === "string" && doc.pageContent.trim().length > 0);
};
