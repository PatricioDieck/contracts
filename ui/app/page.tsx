"use client"
import Image from "next/image";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from "react";

/*
we are going to add the state 
1. create new 
2. view existing
  - dispute button

*/

export default function Home() {
  const [payee, setPayee] = useState("");
  const [specText, setSpecText] = useState("");
  const [amountEth, setAmountEth] = useState(0);



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
            Create a contract
          </p>

          <div className="w-full" >
            <div className="w-full flex flex-row gap-8 justify-between ">

              <div className="flex flex-col w-full gap-8 " >
                <input className="bg-gray-100 p-2 rounded-md" value={specText} onChange={(e) => setSpecText(e.target.value)} placeholder="payer address (you)" />
                <input className="bg-gray-100 w-full p-2 rounded-md" value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="payee address 0x..." />
                <input className="bg-gray-100 p-2 rounded-md" type="number" value={amountEth} onChange={(e) => setAmountEth(Number(e.target.value))} placeholder="amount in ETH"  />
              </div>

              <div className="w-full ">
                <textarea
                  className="bg-gray-100 p-2 rounded-md h-full w-full resize-none"
                  placeholder="specs of the contract- terms, conditions, etc."
                  rows={4}
                />
              </div>

            </div>
            <button className="bg-blue-500 text-white p-2 font-bold rounded-md mt-8">Create Contract</button>
          </div>



        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">

        </div>
      </main>
    </div>
  );
}
