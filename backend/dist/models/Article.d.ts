import mongoose from 'mongoose';
import { IArticle } from '../types';
export declare const Article: mongoose.Model<IArticle, {}, {}, {}, mongoose.Document<unknown, {}, IArticle, {}, {}> & IArticle & Required<{
    _id: string;
}> & {
    __v: number;
}, any>;
export default Article;
//# sourceMappingURL=Article.d.ts.map