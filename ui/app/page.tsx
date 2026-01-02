"use client"
import Image from "next/image";
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useState } from "react";
import { Input } from "@/components/ui/input";

/*
we are going to add the state 
1. create new 
2. view existing
  - dispute button

*/

export default function Home() {
  const [specText, setSpecText] = useState("")
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
        <div className="flex flex-col mt-8 gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Baby Bitcoin
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Create a contract 
          </p>

          <Input type="specs"  placeholder="Specs" />


        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          
        </div>
      </main>
    </div>
  );
}
