import { beforeEach, describe, expect, it } from '@jest/globals';
import 'reflect-metadata';
import { mockCommandInteraction } from '../../../mocks/api/interaction.mock';
import { mockUser } from '../../../mocks/api/user.mock';
import { mockPing } from '../../../mocks/classes/commands.mock';

describe('Ping', () => {
    let command;
    beforeEach(() => {
        command = mockPing();
    });

    describe('run command', () => {
        it('should return successful command result', async () => {
            const expected = {
                executed: true,
                message: `Successfully ponged. Latency is 100 ms.`,
            };
            // TODO: Ping command will forever wait on interaction.reply because it isn't mocked. Back to square one...
            expect(await command.run(mockCommandInteraction({ user: mockUser() }))).toBe(expected);
        });
    });
});
