import { FeatureService } from '@services/feature/feature-service';
import { injectable } from 'inversify';

/** Handles different functions for questions of the day */
@injectable()
export class QotdService extends FeatureService {}
