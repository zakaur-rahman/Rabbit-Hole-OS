import React from 'react';
import Link from 'next/link';

export default async function ChangelogPage({
  searchParams,
}: {
  searchParams: Promise<{ version?: string }>;
}) {
  const resolvedParams = await searchParams;
  const version = resolvedParams.version || 'latest';
  
  // Fetch from GitHub Releases API
  let markdown = '';
  let releaseName = '';
  let releaseDate = '';
  let hasError = false;

  try {
    const apiUrl = version === 'latest' 
      ? 'https://api.github.com/repos/zakaur-rahman/Rabbit-Hole-OS/releases/latest'
      : `https://api.github.com/repos/zakaur-rahman/Rabbit-Hole-OS/releases/tags/v${version.replace(/^v/, '')}`;
      
    const res = await fetch(apiUrl, { next: { revalidate: 3600 } });
    
    if (res.ok) {
      const data = await res.json();
      markdown = data.body || 'No release notes provided.';
      releaseName = data.name || data.tag_name;
      releaseDate = new Date(data.published_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else {
      if (res.status === 404 && version !== 'latest') {
        const fbRes = await fetch(`https://api.github.com/repos/zakaur-rahman/Rabbit-Hole-OS/releases/tags/${version.replace(/^v/, '')}`, { next: { revalidate: 3600 }});
        if (fbRes.ok) {
           const data = await fbRes.json();
           markdown = data.body || 'No release notes provided.';
           releaseName = data.name || data.tag_name;
           releaseDate = new Date(data.published_at).toLocaleDateString();
        } else {
           hasError = true;
        }
      } else {
        hasError = true;
      }
    }
    } catch {
    hasError = true;
  }

  const renderMarkdown = (text: string) => {
    const sections = text.split(/(?=^##\s)/m);
    
    return sections.map((section, idx) => {
       const lines = section.trim().split('\n');
       if (lines.length === 0) return null;
       
       const headerMatch = lines[0].match(/^##\s*(.*)$/);
       const isHeader = !!headerMatch;
       
       return (
         <div key={idx} className={isHeader ? "mt-10" : "mt-2"}>
            {isHeader && (
               <h3 className="font-serif text-[24px] font-bold text-ink mb-6 border-b border-rule pb-2 tracking-tight">
                 {headerMatch[1]}
               </h3>
            )}
            <ul className="list-none m-0 p-0 space-y-4">
               {(isHeader ? lines.slice(1) : lines).map((line, lIdx) => {
                  const item = line.trim();
                  if (!item) return null;
                  
                  const bulletMatch = item.match(/^[-*+]\s+(.*)$/);
                  if (bulletMatch) {
                     const content = bulletMatch[1].replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-ink">$1</span>');
                     
                     return (
                        <li key={lIdx} className="flex items-start gap-4 text-mid text-[13px] font-mono leading-relaxed">
                           <div className="mt-2 w-1.5 h-1.5 rounded-full bg-amber shrink-0" />
                           <span dangerouslySetInnerHTML={{ __html: content }} />
                        </li>
                     );
                  }
                  
                  return <p key={lIdx} className="text-mid text-[13px] font-mono mb-4 leading-relaxed">{item.replace(/^#+\s/, '')}</p>;
               })}
            </ul>
         </div>
       );
    });
  };

  return (
    <div className="min-h-screen bg-paper text-ink pt-32 pb-20 px-6 md:px-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[40%] h-screen border-l border-rule/30 opacity-20 pointer-events-none" />
      
      <div className="max-w-3xl relative z-10">
        <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-mid no-underline mb-12 group font-mono"
        >
            <span className="transition-transform group-hover:-translate-x-1">←</span>
            Back to Home
        </Link>

        <header className="mb-16">
          <div className="text-[10px] tracking-[0.2em] uppercase text-amber mb-4 flex items-center gap-3 font-mono">
              <div className="w-8 h-px bg-amber" />
              Updates
          </div>
          <h1 className="font-serif text-[clamp(40px,6vw,70px)] font-black leading-none tracking-tighter">
              Changelog
          </h1>
        </header>

        {hasError ? (
          <div className="border border-rule bg-cream p-12 shadow-[12px_12px_0_var(--faint)]">
            <h2 className="font-serif text-[24px] font-bold text-ink mb-4">Release Notes Not Found</h2>
            <p className="text-mid text-[13px] font-mono leading-relaxed">
              We couldn&apos;t find the release notes for version {version}.
            </p>
          </div>
        ) : (
          <div className="border border-rule bg-white shadow-[12px_12px_0_var(--faint)] overflow-hidden">
             <div className="bg-cream px-10 py-8 border-b border-rule flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                   <h2 className="font-serif text-[32px] font-bold text-ink mb-2 tracking-tight">
                     {releaseName}
                   </h2>
                   <div className="flex items-center gap-6">
                      <span className="text-amber text-[11px] font-bold tracking-[0.14em] uppercase font-mono">
                         Build v{version.replace(/^v/, '')}
                      </span>
                      <span className="text-mid text-[11px] tracking-[0.08em] font-mono">
                         {releaseDate}
                      </span>
                   </div>
                </div>
             </div>
             
             <div className="p-10">
                {renderMarkdown(markdown)}
             </div>

             <div className="bg-cream px-10 py-6 border-t border-rule text-right">
                <span className="text-[10px] text-mid tracking-[0.1em] uppercase font-mono">Cognode — Built for connected thought</span>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
