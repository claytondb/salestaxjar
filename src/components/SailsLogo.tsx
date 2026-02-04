import Image from 'next/image';

export default function SailsLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <Image
      src="/logo.svg"
      alt="Sails logo"
      width={24}
      height={24}
      className={className}
    />
  );
}
