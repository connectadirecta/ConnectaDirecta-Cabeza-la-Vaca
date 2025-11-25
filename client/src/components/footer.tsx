
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

export function Footer() {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que el click se propague al div padre
  };

  return (
    <footer className="mt-auto py-4 border-t border-border" onClick={handleClick}>
      <div className="container mx-auto px-4 space-y-3">
        <img 
          src="/footer-logos.png" 
          alt="Logos del proyecto" 
          className="mx-auto max-w-full h-auto"
          style={{ maxHeight: '80px' }}
        />
        <div className="flex justify-center">
          <Link href="/additional-info">
            <Button variant="outline" size="sm" className="gap-2">
              <Info size={16} />
              Información Adicional
            </Button>
          </Link>
        </div>
      </div>
    </footer>
  );
}
