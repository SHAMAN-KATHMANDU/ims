import { JwtPayload } from "jsonwebtoken";

interface UserPayload extends JwtPayload {
    id: string;
    role: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: UserPayload;
        }
    }
}