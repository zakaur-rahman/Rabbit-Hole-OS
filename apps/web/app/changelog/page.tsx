import React from 'react';

// For Next.js App Router, page components can be async to fetch data server-side
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
  } catch (e) {
    hasError = true;
  }

  // Basic markdown structural parser tailored for GitHub standard releases
  const renderMarkdown = (text: string) => {
    // 1. Split into sections by Headers (e.g. ## Features)
    const sections = text.split(/(?=^##\s)/m);
    
    return sections.map((section, idx) => {
       const lines = section.trim().split('\n');
       if (lines.length === 0) return null;
       
       const headerMatch = lines[0].match(/^##\s*(.*)$/);
       const isHeader = !!headerMatch;
       
       return (
         <div key={idx} className={isHeader ? "mt-8" : "mt-2"}>
            {isHeader && (
               <h3 className="text-xl font-semibold text-white mb-4 border-b border-gray-800 pb-2">
                 {headerMatch[1]}
               </h3>
            )}
            <ul className="space-y-3">
               {(isHeader ? lines.slice(1) : lines).map((line, lIdx) => {
                  const item = line.trim();
                  if (!item) return null;
                  
                  // Handle bullet points
                  const bulletMatch = item.match(/^[-*+]\s+(.*)$/);
                  if (bulletMatch) {
                     // Very simple bold parsing via regex (**text**) 
                     const content = bulletMatch[1].replace(/\*\*(.*?)\*\*/g, '<span class="font-semibold text-gray-200">$1</span>');
                     
                     return (
                        <li key={lIdx} className="flex items-start gap-3 text-gray-400">
                           <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                           <span dangerouslySetInnerHTML={{ __html: content }} />
                        </li>
                     );
                  }
                  
                  return <p key={lIdx} className="text-gray-400 mb-2">{item.replace(/^#+\s/, '')}</p>;
               })}
            </ul>
         </div>
       );
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Changelog</h1>
          <p className="text-gray-400 text-lg">
            What&apos;s new in Cognode Desktop.
          </p>
        </header>

        {hasError ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
            <h2 className="text-red-400 text-lg font-medium mb-2">Release Notes Not Found</h2>
            <p className="text-gray-400">
              We couldn&apos;t find the release notes for version {version}.
            </p>
          </div>
        ) : (
          <div className="bg-[#121212] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-2xl">
             <div className="bg-[#1a1a1a] px-8 py-6 border-b border-[#2a2a2a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                   <h2 className="text-2xl font-bold text-white mb-1">
                     {releaseName}
                   </h2>
                   <div className="flex items-center gap-3">
                      <span className="bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-full text-xs font-medium border border-blue-500/20">
                         v{version.replace(/^v/, '')}
                      </span>
                      <span className="text-gray-500 text-sm">
                         {releaseDate}
                      </span>
                   </div>
                </div>
             </div>
             
             <div className="p-8">
                {renderMarkdown(markdown)}
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
