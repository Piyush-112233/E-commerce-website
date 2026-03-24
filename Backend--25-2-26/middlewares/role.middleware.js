import { ApiError } from "../validators/ApiError.js"

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json(new ApiError(401, "Unauthorized"));
        }

        if (!roles.length) {
            return res.status(500).json(new ApiError(500, "Server misconfiguration: roles not provided"));
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json(
                new ApiError(403,
                    {
                        message: "Access Denied"
                    }
                )
            );
        }

        next();
    };
};


// export const roleMiddleware = (role) => {
//   return (req, res, next) => {
//     if (req.user.role !== role) {
//       return res.status(403).json({
//         message: "Access denied"
//       });
//     }
//     next();
//   };
// };

export default authorizeRoles;
