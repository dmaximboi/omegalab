import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4 py-10 bg-[#8ec8f0] dark:bg-[#1a3a52]">
      <div className="w-full max-w-lg text-center">
        <div className="relative mx-auto mb-6 w-full max-w-sm aspect-square">
          <Image
            src="/illustrations/404-barrel.png"
            alt="Character looking into an empty barrel"
            fill
            priority
            className="object-contain drop-shadow-sm"
            sizes="(max-width: 512px) 90vw, 384px"
          />
        </div>

        <p className="text-sm font-semibold tracking-[0.2em] text-white/70 mb-2">404</p>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white leading-snug mb-3 px-2">
          BOSS, WHAT YOU ARE LOOKING FOR ISN&apos;T HERE, SIR/MA
        </h1>
        <p className="text-white/80 text-sm sm:text-base mb-8 px-4">
          This page is empty — like that barrel. Head home and we&apos;ll sort you out.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-[#0A1F5C] font-semibold shadow-md hover:bg-white/90 transition"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
