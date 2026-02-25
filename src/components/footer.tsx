import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-display mb-3 inline-block tracking-wide">
              Influen
            </Link>
            <p className="text-sm text-muted-foreground">
              The marketplace connecting influencers and brands for better
              sponsorship deals.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/influencers" className="hover:text-foreground">Browse Influencers</Link></li>
              <li><Link href="/campaigns" className="hover:text-foreground">Campaigns</Link></li>
              <li><Link href="/brands" className="hover:text-foreground">Brands</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">For Influencers</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/auth/signup" className="hover:text-foreground">Create Media Kit</Link></li>
              <li><Link href="/campaigns" className="hover:text-foreground">Find Campaigns</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-3">For Brands</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/auth/signup" className="hover:text-foreground">Post a Campaign</Link></li>
              <li><Link href="/influencers" className="hover:text-foreground">Find Influencers</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Influen. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
