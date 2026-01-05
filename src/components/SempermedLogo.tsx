import harpsLogo from '../assets/harpslogo.svg';

interface SempermedLogoProps {
    className?: string;
}

export const SempermedLogo = ({ className = "h-12" }: SempermedLogoProps) => {
    return (
        <img
            src={harpsLogo}
            alt="Sempermed HARPS Logo"
            className={`object-contain ${className}`}
        />
    )
};
