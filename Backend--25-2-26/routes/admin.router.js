import express from "express";
import { categoryController, categoryDelete, categoryGetAll, categoryUpdate, productAdd, productUpdate, productDelete, productGetAll, productGetById, bulkCreateProducts } from "../controllers/admin.controller.js";
import upload from "../middlewares/multer.js";
import { getUsers } from "../controllers/user.controller.js";
import isAuthVerifyJwt from "../middlewares/isAuth.middleware.js";
import authorizeRoles from "../middlewares/role.middleware.js";


const adminRouter = express.Router();

// Category Router
adminRouter.post("/category", isAuthVerifyJwt, authorizeRoles("admin"), categoryController);
adminRouter.put("/category/:id", isAuthVerifyJwt, authorizeRoles("admin"), categoryUpdate);
adminRouter.delete("/category/:id", isAuthVerifyJwt, authorizeRoles("admin"), categoryDelete);
adminRouter.get("/category/getAll", categoryGetAll);



// Product Router
adminRouter.post("/product",
    upload.fields([
        { name: "images", maxCount: 5 },
        { name: "image", maxCount: 1 },
        { name: "images[]", maxCount: 5 },
    ]),
    isAuthVerifyJwt,
    authorizeRoles("admin"),
    productAdd
);
adminRouter.put('/product/:id',
    isAuthVerifyJwt,
    authorizeRoles("admin"),
    productUpdate
);
adminRouter.delete('/product/:id',
    isAuthVerifyJwt,
    authorizeRoles("admin"),
    productDelete
);

// Public read    
adminRouter.get('/product/getAll',
    productGetAll
);
adminRouter.get('/product/getById',
    productGetById
);

adminRouter.post('/products/bulk',
    isAuthVerifyJwt,
    authorizeRoles("admin"),
    bulkCreateProducts
);


adminRouter.get('/allUsers', isAuthVerifyJwt, authorizeRoles("admin"), getUsers);

export default adminRouter;

