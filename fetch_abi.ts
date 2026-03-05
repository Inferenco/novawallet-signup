async function main() {
    const res = await fetch('https://testnet.cedra.dev/v1/accounts/0xb50c8386acf54439b804bf0835dd72f92e3ab7e72f9996f6c7f9ec9800748a3c/module/poker_texas_holdem');
    const data = await res.json();

    const func = data.abi.exposed_functions.find(f => f.name === 'create_table');
    console.log(JSON.stringify(func, null, 2));
}
main();
