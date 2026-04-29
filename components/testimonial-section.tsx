"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Brigitta - Snowy",
    location: "Indonesia",
    rating: 5,
    content:
      "Groomernya telaten banget, sabar dan detail. Padalah chloe ada gimbal, kalau di tempat lain pasti langsung di gundul tapi di pawship diusahakan untuk nggak perlu gundul.",
    picture:
      "https://res.cloudinary.com/deqpnzfwb/image/upload/v1777449845/Brigitta_-_Snowy_vrhlkx.png",
  },
  {
    id: 2,
    name: "Ivan - Max",
    location: "Indonesia",
    rating: 5,
    content: "Hasil groomingnya bagus dan rapi.",
    picture:
      "https://res.cloudinary.com/deqpnzfwb/image/upload/v1777450060/Ivan_-_Max_fvovcb.jpg",
  },
  {
    id: 3,
    name: "Alicia - Mojito",
    location: "Indonesia",
    rating: 5,
    content: "Hasilnya bersih dan sesuai request.",
    picture:
      "https://res.cloudinary.com/deqpnzfwb/image/upload/v1777450364/Alicia_-_Mojito_pfqynp.jpg",
  },
  {
    id: 4,
    name: "Ratu - Queen",
    location: "Indonesia",
    rating: 5,
    content:
      "Groomingnya bagus dan hasilnya sama sesuai request yang disampaikan.",
    picture:
      "https://res.cloudinary.com/deqpnzfwb/image/upload/v1777450614/Ratu_-_Queen_tz7jhp.png",
  },
  {
    id: 5,
    name: "Sani - Lyon",
    location: "Indonesia",
    rating: 5,
    content:
      "Groomernya sabarr banget padahal kucingku takutan dan ga gitu ramah sama manusia.",
    picture:
      "https://res.cloudinary.com/deqpnzfwb/image/upload/v1777450710/Sani_-_Lyon_iqqydk.jpg",
  },
  {
    id: 6,
    name: "Cindy - Paupau",
    location: "Indonesia",
    rating: 5,
    content:
      "Semua staff sangat ramah dan helpful. Pau juga keliatan seneng banget di pawship, puass bangett.",
    picture:
      "https://res.cloudinary.com/deqpnzfwb/image/upload/v1777450762/Cindy_-_Paupau_nq1oyc.jpg",
  },
  {
    id: 7,
    name: "Windy - Soju",
    location: "Indonesia",
    rating: 5,
    content:
      "Semua staff sangat ramah dan helpful. Pau juga keliatan seneng banget di pawship, puass bangett.",
    picture:
      "https://res.cloudinary.com/deqpnzfwb/image/upload/v1777450817/Windy_-_Soju_qzzjpd.png",
  },
];

const CARD_WIDTH = 350 + 20; // w-[350px] + gap-5 (20px)

export function TestimonialSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const index = Math.round(scrollRef.current.scrollLeft / CARD_WIDTH);
    setActiveIndex(index);
  };

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      left: index * CARD_WIDTH,
      behavior: "smooth",
    });
    setActiveIndex(index);
  };

  return (
    <section id="testimonials" className="bg-card py-20">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="mb-10 text-center">
          <span className="mb-3 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
            Testimoni
          </span>
          <h2 className="font-display text-3xl font-extrabold text-foreground lg:text-4xl">
            What Pawrents Say 🐾
          </h2>
          <p className="mt-3 text-muted-foreground">
            Loved by pets, approved by pawrents everywhere
          </p>
        </div>

        {/* Scroll container */}
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="bg-white rounded-xl p-6 shadow-sm relative hover:shadow-lg transition-all duration-300 border border-gray-100 flex-none w-[350px] snap-start flex flex-col"
              >
                <div className="mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-bold text-foreground text-lg">
                      {testimonial.name}
                    </h3>
                    <Image
                      src="/images/verified.png"
                      alt="verified image"
                      width={20}
                      height={20}
                    />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    {testimonial.location}
                  </p>
                </div>

                {/* Rating */}
                <div className="flex items-center mb-4">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star
                      key={starIndex}
                      className="w-5 h-5 text-yellow-400 fill-current"
                    />
                  ))}
                </div>

                {/* Quote Icon */}
                <div className="absolute top-4 right-4 opacity-10">
                  <Quote className="h-12 w-12 text-gray-400" />
                </div>

                {/* Content with fixed height */}
                <blockquote className="text-gray-700 leading-relaxed flex-1">
                  &ldquo;{testimonial.content}&rdquo;
                </blockquote>

                {/* Testimonial Image */}
                {testimonial.picture && (
                  <div className="mt-3">
                    <a
                      href={testimonial.picture}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block mb-4 cursor-pointer overflow-hidden rounded-lg hover:opacity-90 transition-opacity max-w-[250px] mx-auto"
                    >
                      <div className="relative w-full h-[180px]">
                        <Image
                          src={testimonial.picture}
                          alt={`${testimonial.name}'s testimonial`}
                          fill
                          className="object-cover rounded-lg"
                          sizes="250px"
                        />
                      </div>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="mt-6 flex justify-center gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              aria-label={`Go to testimonial ${i + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? "w-6 bg-primary"
                  : "w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
