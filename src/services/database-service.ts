import { inject, injectable } from "inversify";
import { Logger } from "tslog";
import { TYPES } from "@src/types";
import { connect } from "mongoose";

@injectable()
export class DatabaseService {
    private readonly logger: Logger;
    private readonly connectionString: string;

    constructor(
        @inject(TYPES.ServiceLogger) logger: Logger,
    ) {
        this.logger = logger;
        this.connectionString = process.env.MONGODB_CONNSTR;
    }

    public connect(): Promise<void> {
        return connect(this.connectionString)
            .then(() => {
                this.logger.debug(`Successfully connected to ${this.connectionString}`);
                return Promise.resolve();
            })
            .catch((error) => {
                this.logger.error(`Could not connect to ${this.connectionString}:`,
                    this.logger.prettyError(error));
                return Promise.reject();
            });
    }

}