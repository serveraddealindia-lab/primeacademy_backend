import { Model, Optional } from 'sequelize';
export declare enum BatchMode {
    ONLINE = "online",
    OFFLINE = "offline",
    HYBRID = "hybrid"
}
export interface BatchAttributes {
    id: number;
    title: string;
    software: string | null;
    mode: BatchMode;
    startDate: Date;
    endDate: Date;
    maxCapacity: number;
    schedule: any | null;
    createdByAdminId: number | null;
    status: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}
export interface BatchCreationAttributes extends Optional<BatchAttributes, 'id' | 'software' | 'schedule' | 'createdByAdminId' | 'status' | 'createdAt' | 'updatedAt'> {
}
declare class Batch extends Model<BatchAttributes, BatchCreationAttributes> implements BatchAttributes {
    id: number;
    title: string;
    software: string | null;
    mode: BatchMode;
    startDate: Date;
    endDate: Date;
    maxCapacity: number;
    schedule: any | null;
    createdByAdminId: number | null;
    status: string | null;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export default Batch;
//# sourceMappingURL=Batch.d.ts.map