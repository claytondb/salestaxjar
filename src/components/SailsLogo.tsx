import Image from 'next/image';

export default function SailsLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <Image
      src="/logo.jpg"
      alt="Sails logo"
      width={101}
      height={101}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}
