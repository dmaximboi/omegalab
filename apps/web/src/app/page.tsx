import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const services = [
  {
    title: "Procurement",
    desc: "We source and supply high-quality laboratory, medical, and scientific equipment from trusted global manufacturers. Our procurement team ensures competitive pricing, authenticity verification, and timely delivery to institutions across Nigeria.",
    image: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80"
  },
  {
    title: "Construction",
    desc: "Our expert team handles complete laboratory construction and rehabilitation projects. From architectural planning to final installation, we create modern, compliant lab spaces that meet international standards and safety regulations.",
    image: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&q=80"
  },
  {
    title: "Factory Equipment",
    desc: "We supply and install industrial-grade factory equipment including production machinery, safety systems, and quality control instruments. Our solutions enhance productivity while maintaining strict compliance with manufacturing standards.",
    image: "https://images.unsplash.com/photo-1513828583688-c52646db42da?w=800&q=80"
  },
  {
    title: "Installation",
    desc: "Our certified technicians provide professional installation services for all types of laboratory and medical equipment. We ensure proper setup, calibration, and testing to guarantee optimal performance and safety compliance.",
    image: "https://images.unsplash.com/photo-1581093450021-4a7360e9a6b5?w=800&q=80"
  },
  {
    title: "Maintenance",
    desc: "We offer comprehensive maintenance contracts to keep your equipment running at peak efficiency. Our preventive maintenance programs minimize downtime and extend equipment lifespan through regular inspections and timely repairs.",
    image: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80"
  },
  {
    title: "Training",
    desc: "We provide specialized training programs for laboratory personnel on equipment operation, safety protocols, and best practices. Our training ensures your team is skilled and compliant with industry standards.",
    image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80"
  }
];

const clients = [
  { name: "Federal Universities", desc: "Supporting academic excellence with state-of-the-art lab equipment" },
  { name: "Teaching Hospitals", desc: "Equipping healthcare facilities with reliable medical instruments" },
  { name: "Research Institutes", desc: "Enabling groundbreaking research with precision equipment" },
  { name: "Pharmaceutical Companies", desc: "Supplying quality control and production equipment" },
  { name: "Private Laboratories", desc: "Partnering with diagnostic and testing facilities" },
  { name: "Manufacturing Plants", desc: "Providing industrial equipment for production lines" },
  { name: "Government Agencies", desc: "Supporting public health and safety initiatives" },
  { name: "NGOs & International Orgs", desc: "Collaborating on healthcare development projects" },
];

// JSON-LD structured data for Google rich results
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "De-Omega Labaffairs Nig. Ltd.",
  alternateName: "De-Omega Labaffairs",
  url: "https://omegalabaffairs.com",
  logo: "https://i.ibb.co/LdGYh0t5/IMG-20260516-WA0025.jpg",
  description: "Nigeria's leading laboratory, medical, scientific, and factory equipment supplier offering procurement, installation, maintenance, and training services.",
  foundingDate: "2005",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Ilorin",
    addressRegion: "Kwara State",
    addressCountry: "NG",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+2348132862637",
    contactType: "sales",
    availableLanguage: ["English"],
    areaServed: "NG",
  },
  sameAs: [],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Laboratory Equipment Catalogue",
    itemListElement: [
      { "@type": "OfferCatalog", name: "Laboratory Equipment" },
      { "@type": "OfferCatalog", name: "Medical Equipment" },
      { "@type": "OfferCatalog", name: "Scientific Instruments" },
      { "@type": "OfferCatalog", name: "Factory Equipment" },
    ],
  },
  areaServed: {
    "@type": "Country",
    name: "Nigeria",
  },
  knowsAbout: [
    "laboratory equipment",
    "medical equipment",
    "scientific instruments",
    "lab construction",
    "equipment installation",
    "equipment maintenance",
    "chemical lab equipment Nigeria",
    "laboratory supplies Nigeria",
  ],
};

const localBusinessLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://omegalabaffairs.com",
  name: "De-Omega Labaffairs Nig. Ltd.",
  image: "https://i.ibb.co/LdGYh0t5/IMG-20260516-WA0025.jpg",
  telephone: "+2348132862637",
  email: "info@omegalabaffairs.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Ilorin",
    addressLocality: "Ilorin",
    addressRegion: "Kwara State",
    postalCode: "240001",
    addressCountry: "NG",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 8.4966,
    longitude: 4.5426,
  },
  priceRange: "₦₦₦",
  openingHours: "Mo-Su 08:00-19:00",
};

export default function HomePage() {
  return (
    <>
      {/* Structured Data for Google */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessLd) }}
      />
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative bg-navy/80 text-white overflow-hidden min-h-[80vh] flex items-center">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="https://i.ibb.co/4w4dC3fQ/IMG-20260516-WA0026.jpg"
            alt="Laboratory background"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            quality={75}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-navy/70 via-navy/50 to-navy/40" />
        </div>
        <div className="container relative py-16 md:py-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-tight mb-6 animate-fade-in">
              Laboratory & Medical Equipment Solutions
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed animate-fade-in">
              Nigeria&apos;s trusted partner for procurement, installation, and maintenance of laboratory, medical, scientific, and factory equipment.
            </p>
            <div className="flex flex-wrap gap-4 animate-fade-in">
              <Link href="/catalogue" className="btn btn-secondary btn-lg">
                View Catalogue
              </Link>
              <Link href="/contact" className="btn bg-white/10 text-white hover:bg-white/20 btn-lg backdrop-blur">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="section bg-light-grey dark:bg-gray-800/50">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-8 text-center">
              About De-Omega Labaffairs
            </h2>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <Image
                  src="https://i.ibb.co/LdGYh0t5/IMG-20260516-WA0025.jpg"
                  alt="De-Omega Labaffairs"
                  width={400}
                  height={400}
                  className="rounded-2xl shadow-lg mx-auto"
                />
              </div>
              <div className="space-y-4">
                <p className="text-lg text-navy/80 dark:text-gray-200 leading-relaxed">
                  <strong>De-Omega Labaffairs Nig. Ltd.</strong> is a premier Nigerian company established to bridge the gap in quality laboratory and medical equipment supply across West Africa.
                </p>
                <p className="text-navy/70 dark:text-gray-300 leading-relaxed">
                  With over a decade of experience, we have built strong partnerships with leading global manufacturers, enabling us to deliver authentic, high-quality equipment at competitive prices.
                </p>
                <p className="text-navy/70 dark:text-gray-300 leading-relaxed">
                  Our team comprises certified engineers, procurement specialists, and industry consultants who understand the unique needs of Nigerian institutions. We don&apos;t just sell equipment—we provide complete solutions from consultation to installation and ongoing support.
                </p>
                <p className="text-navy/70 dark:text-gray-300 leading-relaxed">
                  Based in <strong>Ilorin, Kwara State</strong>, we serve clients nationwide and are committed to advancing scientific research, healthcare delivery, and industrial development in Nigeria.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="section dark:bg-gray-900">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-12">
            Our Services
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service, i) => (
              <div key={i} className="card card-hover group overflow-hidden">
                <div className="relative h-40 -mx-5 -mt-5 mb-4">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    quality={70}
                  />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-navy dark:text-white">{service.title}</h3>
                <p className="text-navy/60 dark:text-gray-400 text-sm leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Clients Section */}
      <section className="section bg-light-grey dark:bg-gray-800/50">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-center mb-4">
            Who We Serve
          </h2>
          <p className="text-center text-navy/60 dark:text-gray-400 mb-12 max-w-2xl mx-auto">
            We are proud to partner with leading institutions across Nigeria, providing them with reliable equipment and exceptional service.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {clients.map((client, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-border dark:border-gray-700 hover:border-sky/30 hover:shadow-soft transition-all">
                <h4 className="font-semibold text-navy dark:text-white mb-2">{client.name}</h4>
                <p className="text-sm text-navy/60 dark:text-gray-400">{client.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section bg-navy text-white">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Browse our catalogue of quality laboratory and medical equipment, or contact us for custom solutions.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/catalogue" className="btn btn-secondary btn-lg">
              Browse Catalogue
            </Link>
            <Link href="/contact" className="btn bg-white/10 text-white hover:bg-white/20 btn-lg">
              Get in Touch
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
