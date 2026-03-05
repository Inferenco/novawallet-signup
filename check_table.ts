import { getTableAddress, getTableSummary } from './src/features/games/services/poker/views';

async function main() {
    const adminAddr = '0x67e37fd25857c62500b0ffded350d36a84c4d99557ea38d93b4854df296df94a';
    try {
        console.log("Looking up table for", adminAddr);
        const tableAddr = await getTableAddress('testnet', adminAddr);
        console.log("Table Address:", tableAddr);

        console.log("\nFetching summary...");
        const summary = await getTableSummary('testnet', tableAddr);
        console.log("Table Summary:", summary);
    } catch (err) {
        if (err instanceof Error) {
            console.error(err.message);
        } else {
            console.error(err);
        }
    }
}
main();
