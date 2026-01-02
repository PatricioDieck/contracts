"use client"
import Image from "next/image";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";


/*
we are going to add the state 
1. create new 
2. view existing
  - dispute button

*/

/*
struct Case {
    address payer;
    address payee;
    uint256 amount;

    bytes32 specs;
    bytes32 deliverables;
    uint64 reviewDeadline;

    Status status;
}
*/

export default function Home() {
  const { address } = useAccount();
  console.log("payer address",address);

  const [payer, setPayer] = useState("0x...");
  const [payee, setPayee] = useState("");
  const [amountEth, setAmountEth] = useState(0);
  const [specText, setSpecText] = useState("");

  useEffect(() => {
    if (address) setPayer(address ); 
  }, [address]);


  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center py-32 px-16 bg-white dark:bg-black sm:items-start">
        <div className="flex flex-row items-center justify-between gap-6 text-center w-full sm:text-left ">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="Next.js logo"
            width={100}
            height={20}
            priority
          />
          <ConnectButton />
        </div>
        <div className="flex flex-col mt-8 gap-6 text-center sm:items-start sm:text-left w-full">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Baby Bitcoin
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Create Contract
          </p>

          <div className="w-full">
            <div className="w-full flex flex-row gap-4 justify-between mb-8 " style={{ minHeight: 280 }}>
              <div className="flex flex-col w-full gap-2 mb-0  justify-between">
                <label className="block font-medium text-gray-700 dark:text-zinc-300">
                  Payer Address (you)
                </label>
                <input className="bg-gray-100 p-2 text-gray-400 rounded-md" value={payer} disabled placeholder="payer address (you)" />
                <label className="block  font-medium text-gray-700 dark:text-zinc-300">
                  Payee Address
                </label>
                <input className="bg-gray-100 w-full p-2 rounded-md" value={payee} onChange={(e) => setPayee(e.target.value as `0x${string}`)} placeholder="0x..." />
                <label className="block  font-medium text-gray-700 dark:text-zinc-300">
                  Amount in ETH
                </label>
                <input className="bg-gray-100 p-2 rounded-md" type="number" value={amountEth} onChange={(e) => setAmountEth(Number(e.target.value) as number)} placeholder="amount in ETH"  />
              </div>

              <div className="w-full flex flex-col h-[280px]">
                <label className="block font-medium text-gray-700 dark:text-zinc-300 mb-2">
                  Specs of the Contract
                </label>
                <textarea
                  className="bg-gray-100 p-2 rounded-md w-full flex-1 resize-none"
                  placeholder="specs of the contract- terms, conditions, etc."
                  value={specText} onChange={(e) => setSpecText(e.target.value)} 
                />
              </div>
            </div>
            <button className="bg-blue-500 text-white p-2 font-bold rounded-md">Create Contract</button>
          </div>


        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">

        </div>
      </main>
    </div>
  );
}
