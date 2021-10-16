import { injectable } from 'inversify';
import { TYPES } from '@src/types';
import { connect } from 'mongoose';
import { Service } from '@services/service';
import container from '@src/inversify.config';

@injectable()
export class DatabaseService extends Service {
    private readonly connectionString: string = container.get<string>(
        TYPES.MongoDbConnectionString
    );

    public connect(): Promise<void> {
        return connect(this.connectionString)
            .then(() => {
                return Promise.resolve();
            })
            .catch((error) => {
                this.logger.error(`Could not connect to MongoDB:`, this.logger.prettyError(error));
                return Promise.reject();
            });
    }
}
