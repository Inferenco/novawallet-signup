import { getCedraClient } from './src/features/games/core/transactions';

async function main() {
    const cedra = getCedraClient('testnet');

    // contract info
    const moduleAddress = '0xb50c8386acf54439b804bf0835dd72f92e3ab7e72f9996f6c7f9ec9800748a3c';
    const functionId = `${moduleAddress}::poker_texas_holdem::create_table`;

    const adminAddr = '0x67e37fd25857c62500b0ffded350d36a84c4d99557ea38d93b4854df296df94a';

    console.log("Simulating create_table for", adminAddr);
    try {
        const payload = {
            function: functionId,
            typeArguments: [],
            functionArguments: [
                2,          // smallBlind
                4,          // bigBlind
                50,         // minBuyIn
                250,        // maxBuyIn
                0,          // ante
                false,      // straddleEnabled
                5,          // MAX_SEATS
                0,          // tableSpeed
                "Test Table",// name
                1           // colorIndex
            ]
        };

        const tx = await cedra.transaction.build.simple({
            sender: adminAddr,
            data: payload,
        });

        const [simResult] = await cedra.transaction.simulate.simple({
            signerPublicKey: "0x0000000000000000000000000000000000000000000000000000000000000000", // dummy pubkey 
            transactionBuildMethod: async () => tx,
        });

        console.log("Simulation Result:", simResult.success);
        if (!simResult.success) {
            console.log("VM Status:", simResult.vm_status);
        }
    } catch (err) {
        console.error("Simulation failed:", err.message);
    }
}
main();
