import uploadOnCloudinary from "../config/cloudinary.js";
import CategoryModel from "../model/category.model.js";
import ProductModel from "../model/product.model.js";
import { ApiError } from "../validators/ApiError.js"
import { ApiResponse } from "../validators/ApiResponse.js";

export const categoryController = async (req, res) => {
    try {
        const { name } = req.body
        if (!name) {
            return res.status(401).json(
                new ApiError(400, "Not Found Category")
            );
        }

        const category = await CategoryModel.create({
            name
        })

        category.save();
        const categoryObj = category.toObject();
        return res.status(201).json(
            new ApiResponse(200,
                { categoryObj },
                "Category Created Succesfully"
            )
        )
    } catch (error) {
        res.status(500).json(
            new ApiError(500, `Server error ${error.message}`)
        )
    }
}

export const categoryUpdate = async (req, res) => {
    try {
        let { name } = req.body;
        let id = req.params.id;
        // console.log("ID:", req.params.id);
        // console.log("BODY:", req.body);
        await CategoryModel.findOneAndUpdate({ _id: id }, { name: name });
        // console.log(update)
        // await update.save();
        res.status(201).json(
            new ApiResponse(200, { message: "Category Update Succesfully" })
        )
    } catch (error) {
        res.status(501).json(
            new ApiError(500, `Server error ${error.message}`)
        )
    }
}

export const categoryDelete = async (req, res) => {
    try {
        const id = req.params.id;
        await CategoryModel.findByIdAndDelete({ _id: id })
        res.status(201).json(
            new ApiResponse(201, { message: "Deleted Successfully" })
        )
    } catch (error) {
        res.status(501).json(
            new ApiError(500, `Server error ${error.message}`)
        )
    }

}

export const categoryGetAll = async (req, res) => {
    try {
        let categories = await CategoryModel.find();
        res.status(201).json(
            new ApiResponse(200, { categories }, "Categories fetched Successfully")
        )
    } catch (error) {
        res.status(501).json(
            new ApiError(500, "Server Error")
        )
    }
}




export const productAdd = async (req, res) => {
    try {
        // console.log("🔥 API HIT");
        // productData will come as string in multipart/form-data
        const productData = typeof req.body.productData === 'string' ? JSON.parse(req.body.productData) : req.body.productData;
        console.log("body:", req.body);
        console.log("files keys:", req.files ? Object.keys(req.files) : null);
        console.log("files:", req.files);

        // Upload to cloudinary (multer puts temp file path in req.files)
        const upload = await uploadOnCloudinary(req.files?.images?.[0]?.path);

        if (!upload) {
            return res.status(400).json(
                new ApiError(400, "Image Upload failed")
            )
        }

        // console.log("REQ BODY:", req.body);
        const product = await ProductModel.create({ ...productData, imageUrl: upload.secure_url || upload.url, imagePublicId: upload.public_id })
        // console.log("✅ Products:", product);
        const productObj = product.toObject();
        res.status(201).json(
            new ApiResponse(
                200,
                { productObj },
                "Product Created Successfully"
            )
        )
    } catch (error) {
        // console.log("❌ REAL ERROR:", error);
        res.status(501).json(
            new ApiError(
                500,
                `Server Error ${error.message}`
            )
        )
    }
}

export const productUpdate = async (req, res) => {
    try {
        // const { name } = req.body;
        const id = req.params.id;
        console.log("ID:", req.params.id);
        console.log("Body", req.body)

        const update = await ProductModel.findByIdAndUpdate({ _id: id },
            req.body  // Update Everything
        );
        console.log(update)
        res.status(201).json(
            new ApiResponse(
                200,
                "Product Update Successfully"
            )
        )
    } catch (error) {
        res.status(500).json(
            new ApiError(
                500,
                `Server Error ${error.message}`
            )
        )
    }
}

export const productDelete = async (req, res) => {
    try {
        const id = req.params.id;
        await ProductModel.findByIdAndDelete({ _id: id });
        res.status(201).json(
            new ApiResponse(
                200,
                "Product Deleted Successfully"
            )
        )
    } catch (error) {
        res.status(500).json(
            new ApiError(
                500,
                `Server Error ${error.message}`
            )
        )
    }
}

export const productGetAll = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);
        // console.log("🔥 API HIT");
        let products = await ProductModel.find().populate("categoryId", "name").skip((page -1) * limit).limit(limit);
        
        // console.log("✅ Products:", products);
        const productObj = products.map(p => p.toObject());
        return res.status(200).json(
            new ApiResponse(
                200,
                { productObj },
                "Product Fetched Successfully"
            )
        )
    } catch (error) {
        // console.log("❌ REAL ERROR:", error);
        res.status(500).json(
            new ApiError(
                500,
                `Server Error ${error.message}`
            )
        )
    }
}

export const productGetById = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await ProductModel.findById({ _id: id });
        const productObj = product.toObject();
        res.status(201).json(
            new ApiResponse(
                200,
                { productObj },
                "Product Fetch By Id Successfully"
            )
        )
    } catch (error) {
        res.status(500).json(
            new ApiError(
                500,
                `Server Error ${error.message}`
            )
        )
    }
}

// post /products/bulk
export const bulkCreateProducts = async (req, res) => {
  try {
    const items = req.body?.products;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "products array required" });
    }

    const normalized = items.map((p) => ({
      name: (p?.name ?? "").toString().trim(),
      price: Number(p?.price ?? 0),
      categoryId: p?.categoryId ?? null, // allow null
    }));

    // still validate name + price
    const bad = normalized.find(p => !p.name || !Number.isFinite(p.price) || p.price <= 0);
    if (bad) {
      return res.status(400).json({ message: "Each product requires valid name and price", badRow: bad });
    }

    const created = await ProductModel.insertMany(normalized, { ordered: false });

    return res.status(201).json(
      new ApiResponse(200, { createdCount: created.length, products: created }, "Bulk products created")
    );
  } catch (error) {
    return res.status(500).json(new ApiError(500, `Server Error ${error.message}`));
  }
};