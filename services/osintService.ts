export interface OsintData {
    dns?: any;
    whois?: any;
    phone?: any;
    username?: any[];
}

export async function performOsintLookup(target: string): Promise<OsintData> {
    const data: OsintData = {};
    
    // Detect target type
    const isPhone = /^\+?[1-9]\d{1,14}$/.test(target.replace(/\s+/g, ''));
    const isUrl = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/.test(target);
    const isDomain = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}$/i.test(target);

    try {
        if (isPhone) {
            const res = await fetch(`/api/osint/phone/${encodeURIComponent(target)}`);
            data.phone = await res.json();
        } else if (isUrl || isDomain) {
            const domain = isUrl ? new URL(target.startsWith('http') ? target : `https://${target}`).hostname : target;
            
            const [dnsRes, whoisRes] = await Promise.all([
                fetch(`/api/osint/dns/${encodeURIComponent(domain)}`),
                fetch(`/api/osint/whois/${encodeURIComponent(domain)}`)
            ]);
            
            data.dns = await dnsRes.json();
            data.whois = await whoisRes.json();
        } else {
            // Assume username
            const res = await fetch(`/api/osint/username/${encodeURIComponent(target)}`);
            const results = await res.json();
            data.username = results.filter((r: any) => r.available === false);
        }
    } catch (error) {
        console.error("OSINT Lookup failed:", error);
    }

    return data;
}
