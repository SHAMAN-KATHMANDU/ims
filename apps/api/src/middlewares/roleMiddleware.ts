import { Request, Response, NextFunction } from "express";
const authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ message: "User not authenticated" });
        }
        
        const userRole = req.user.role as string;
        
        if (!userRole) {
            return res.status(403).json({ message: "User role not found in token" });
        }
        
        if (!roles.includes(userRole)) {
            return res.status(403).json({ 
                message: "Unauthorized", 
                required: roles,
                current: userRole
            });
        }
        next();
    }
}

export default authorizeRoles;