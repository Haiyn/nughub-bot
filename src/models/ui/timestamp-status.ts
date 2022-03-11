/** The status messages timestamps can have */
export enum TimestampStatus {
    JustStarted = `🆕 Just Started`,
    InTime = `✅ In Time`,
    FirstReminder = `❕ First reminder sent`,
    SecondReminder = `❗ Last reminder sent`,
    OverdueReminder = `❗️ Last reminder sent; reply is overdue after hiatus`,
    ManuallySetTurn = `❔ Manually set turn; No notification`,
}
