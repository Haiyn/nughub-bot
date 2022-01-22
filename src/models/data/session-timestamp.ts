/** The data a timestamp post needs */
export interface SessionTimestamp {
    /** The text channel for the session timestamp */
    channelId: string;

    /** The user for the timestamp */
    userId: string;

    /** Timestamp when the turn switched to them */
    timestamp: number;
}
