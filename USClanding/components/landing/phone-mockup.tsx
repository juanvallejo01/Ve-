import Image from "next/image"
import { Caveat } from "next/font/google"
import { Home, Compass, MessageCircle, Trophy, User, Heart, MessageSquare, Share2, Search, Plus } from "lucide-react"

const caveat = Caveat({ subsets: ["latin"], weight: ["700"] })

export function PhoneMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[300px] animate-float">
      {/* Ambient glow behind the phone */}
      <div className="absolute inset-0 -z-10 scale-90 rounded-full bg-black/10 dark:bg-white/10 blur-3xl" />

      <div className="relative aspect-[390/844] w-full overflow-hidden rounded-[42px] bg-background ring-1 ring-black/10 dark:ring-white/10 shadow-2xl">
        {/* Header — mirrors the real Inicio header: logo, search bar, + */}
        <div className="flex items-center gap-2 px-3 pt-5">
          <span className={`${caveat.className} text-2xl leading-none text-foreground shrink-0`}>Ve!</span>
          <div className="flex-1 h-6 flex items-center gap-1.5 rounded-full bg-foreground/10 px-2.5">
            <Search size={10} className="text-foreground/40 shrink-0" />
            <div className="h-1.5 w-12 rounded-full bg-foreground/15" />
          </div>
          <Plus size={16} className="text-foreground shrink-0" strokeWidth={2.5} />
        </div>

        {/* Mini post card */}
        <div className="mt-3 px-3">
          <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-black/5 dark:ring-white/5">
            <div className="flex items-center gap-2 px-2.5 py-2">
              <div className="h-6 w-6 rounded-full bg-gradient-to-br from-black to-neutral-600 dark:from-white dark:to-neutral-300" />
              <div className="h-2 w-16 rounded-full bg-foreground/15" />
            </div>
            <div className="relative aspect-square w-full">
              <Image src="/images/feed-post-1.jpg" alt="" fill className="object-cover" sizes="300px" />
            </div>
            <div className="flex items-center gap-3 px-2.5 py-2 text-foreground/70">
              <Heart size={13} />
              <MessageSquare size={13} />
              <Share2 size={13} />
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-around border-t border-black/5 dark:border-white/10 bg-background/90 px-2 py-3 backdrop-blur-xl">
          {[Home, Compass, MessageCircle, Trophy, User].map((Icon, i) => (
            <div
              key={i}
              className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                i === 0 ? "bg-foreground/10 text-foreground" : "text-foreground/30"
              }`}
            >
              <Icon size={15} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
