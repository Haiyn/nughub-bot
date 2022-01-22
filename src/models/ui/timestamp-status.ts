/** The status messages timestamps can have */
export enum TimestampStatus {
    InTime = `✅ In Time`,
    FirstReminder = `❕ First reminder sent`,
    SecondReminder = `⚠️ Second reminder sent; soon to be skipped`,
    SkipPromptActive = `❗ Skip Prompt active`,
    SkipDismissed = `❔ Skip dismissed; No Reply`,
    SkipFailed = `❌ Skip failed; No Reply`,
}
