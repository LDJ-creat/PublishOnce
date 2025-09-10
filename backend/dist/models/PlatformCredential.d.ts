import mongoose, { Document } from 'mongoose';
export interface IPlatformCredential extends Document {
    userId: mongoose.Types.ObjectId;
    platform: string;
    credentials: {
        username?: string;
        password?: string;
        email?: string;
        phone?: string;
        token?: string;
        apiKey?: string;
        [key: string]: any;
    };
    isActive: boolean;
    lastUsed?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const PlatformCredential: mongoose.Model<IPlatformCredential, {}, {}, {}, mongoose.Document<unknown, {}, IPlatformCredential, {}, {}> & IPlatformCredential & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default PlatformCredential;
//# sourceMappingURL=PlatformCredential.d.ts.map