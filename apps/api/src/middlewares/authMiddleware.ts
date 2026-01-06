import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    }

    if (!token) {
        return res.status(401).json({ message: "No token, authorization denied" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
        
        // Ensure the decoded token has required fields
        if (!decoded.id || !decoded.role) {
            return res.status(401).json({ 
                message: "Token is missing required fields (id or role)",
                decoded: decoded
            });
        }
        
        req.user = {
            id: decoded.id,
            role: decoded.role,
            ...decoded
        };
        
        console.log("The decoded user is:", req.user);
        next(); 
    } catch (err: any) {
        console.error("Token verification error:", err);
        return res.status(401).json({ 
            message: "Token is not valid",
            error: err.message 
        });
    }
};

export default verifyToken;
