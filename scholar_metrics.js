// Auto-generated Google Scholar metrics
// Last updated: 2025-10-07
// Source: Manual (fallback)

const scholarMetrics = {
    hIndex: 4,
    i10Index: 4,
    totalCitations: 183,
    publicationsCount: 9,
    lastUpdated: "2025-10-07",
    scholarId: "H8fc2JgAAAAJ",
    source: "Manual (fallback)",
    authorName: "Evangelos-Marios Nikolados"
};

// Function to update metrics on the page
function updateScholarMetrics() {
    // Update H-index
    const hIndexElement = document.getElementById('h-index');
    if (hIndexElement) {
        hIndexElement.textContent = `H-index: ${scholarMetrics.hIndex}`;
    }
    
    // Update citations
    const citationsElement = document.getElementById('citations');
    if (citationsElement) {
        citationsElement.textContent = `Citations: ${scholarMetrics.totalCitations}`;
    }
    
    // Update last updated date
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
        const date = new Date(scholarMetrics.lastUpdated);
        lastUpdatedElement.textContent = date.toLocaleDateString();
    }
    
    // Update any other elements that might exist
    const i10Element = document.getElementById('i10-index');
    if (i10Element) {
        i10Element.textContent = `i10-index: ${scholarMetrics.i10Index}`;
    }
    
    const pubCountElement = document.getElementById('pub-count');
    if (pubCountElement) {
        pubCountElement.textContent = `Publications: ${scholarMetrics.publicationsCount}`;
    }
    
    // Log success
    console.log('Scholar metrics updated:', scholarMetrics);
}

// Auto-update when the DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateScholarMetrics);
} else {
    updateScholarMetrics();
}

// Also update if the script is loaded after page load
setTimeout(updateScholarMetrics, 100);
