#!/usr/bin/env python3
"""
Google Scholar Metrics Fetcher for E-M Nikolados
Fetches metrics using Semantic Scholar API as primary source
Falls back to manual values if API fails
"""

import json
import requests
from datetime import datetime
import sys
import os

# Configuration
GOOGLE_SCHOLAR_ID = "H8fc2JgAAAAJ"
AUTHOR_NAME = "Evangelos-Marios Nikolados"

def fetch_semantic_scholar_metrics():
    """
    Fetch metrics from Semantic Scholar API (more reliable than scraping).
    """
    try:
        # Search for author by name
        search_url = "https://api.semanticscholar.org/graph/v1/author/search"
        params = {"query": AUTHOR_NAME, "limit": 5}
        
        response = requests.get(search_url, params=params)
        response.raise_for_status()
        
        authors = response.json().get("data", [])
        
        # Find the most likely match (you may need to verify this is correct)
        author_id = None
        for author in authors:
            if "Nikolados" in author.get("name", ""):
                author_id = author["authorId"]
                break
        
        if not author_id:
            print(f"Warning: Could not find author ID for {AUTHOR_NAME}")
            return None
        
        # Fetch detailed author information
        author_url = f"https://api.semanticscholar.org/graph/v1/author/{author_id}"
        params = {
            "fields": "name,hIndex,citationCount,publicationCount,papers.title,papers.citationCount,papers.year,papers.venue,papers.authors"
        }
        
        response = requests.get(author_url, params=params)
        response.raise_for_status()
        
        data = response.json()
        
        # Calculate i10-index (papers with at least 10 citations)
        i10_count = 0
        papers = data.get("papers", [])
        for paper in papers:
            if paper.get("citationCount", 0) >= 10:
                i10_count += 1
        
        metrics = {
            "h_index": data.get("hIndex", 0),
            "i10_index": i10_count,
            "total_citations": data.get("citationCount", 0),
            "publications_count": data.get("publicationCount", 0),
            "last_updated": datetime.now().strftime("%Y-%m-%d"),
            "scholar_id": GOOGLE_SCHOLAR_ID,
            "source": "Semantic Scholar",
            "author_name": data.get("name", AUTHOR_NAME)
        }
        
        print(f"✅ Successfully fetched metrics from Semantic Scholar")
        print(f"   H-index: {metrics['h_index']}")
        print(f"   Citations: {metrics['total_citations']}")
        print(f"   Publications: {metrics['publications_count']}")
        
        return metrics
        
    except Exception as e:
        print(f"⚠️ Error fetching from Semantic Scholar: {e}")
        return None

def fetch_crossref_metrics():
    """
    Fetch additional metrics from CrossRef as a backup.
    """
    try:
        # Search for works by author
        url = "https://api.crossref.org/works"
        params = {
            "query.author": AUTHOR_NAME,
            "rows": 100
        }
        
        response = requests.get(url)
        response.raise_for_status()
        
        data = response.json()
        items = data.get("message", {}).get("items", [])
        
        total_citations = 0
        publication_count = len(items)
        
        # Count citations (note: CrossRef citation data is limited)
        for item in items:
            total_citations += item.get("is-referenced-by-count", 0)
        
        print(f"✅ CrossRef data: {publication_count} publications found")
        
        return {
            "total_citations_crossref": total_citations,
            "publications_crossref": publication_count
        }
        
    except Exception as e:
        print(f"⚠️ Error fetching from CrossRef: {e}")
        return None

def get_fallback_metrics():
    """
    Return manually updated metrics as fallback.
    These should be updated periodically based on your actual Google Scholar profile.
    """
    return {
        "h_index": 6,
        "i10_index": 3,
        "total_citations": 124,
        "publications_count": 10,
        "last_updated": datetime.now().strftime("%Y-%m-%d"),
        "scholar_id": GOOGLE_SCHOLAR_ID,
        "source": "Manual (fallback)",
        "author_name": AUTHOR_NAME
    }

def save_metrics_to_json(metrics, filename="scholar_metrics.json"):
    """
    Save metrics to JSON file for backup.
    """
    try:
        # Ensure we're in the right directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(script_dir)
        filepath = os.path.join(parent_dir, filename)
        
        with open(filepath, 'w') as f:
            json.dump(metrics, f, indent=2)
        print(f"✅ Metrics saved to {filename}")
        return True
    except Exception as e:
        print(f"❌ Error saving JSON: {e}")
        return False

def create_javascript_file(metrics, filename="scholar_metrics.js"):
    """
    Create JavaScript file that can be included in the HTML.
    """
    try:
        # Ensure we're in the right directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        parent_dir = os.path.dirname(script_dir)
        filepath = os.path.join(parent_dir, filename)
        
        js_content = f"""// Auto-generated Google Scholar metrics
// Last updated: {metrics['last_updated']}
// Source: {metrics.get('source', 'Unknown')}

const scholarMetrics = {{
    hIndex: {metrics.get('h_index', 0)},
    i10Index: {metrics.get('i10_index', 0)},
    totalCitations: {metrics.get('total_citations', 0)},
    publicationsCount: {metrics.get('publications_count', 0)},
    lastUpdated: "{metrics['last_updated']}",
    scholarId: "{metrics['scholar_id']}",
    source: "{metrics.get('source', 'Unknown')}",
    authorName: "{metrics.get('author_name', AUTHOR_NAME)}"
}};

// Function to update metrics on the page
function updateScholarMetrics() {{
    // Update H-index
    const hIndexElement = document.getElementById('h-index');
    if (hIndexElement) {{
        hIndexElement.textContent = `H-index: ${{scholarMetrics.hIndex}}`;
    }}
    
    // Update citations
    const citationsElement = document.getElementById('citations');
    if (citationsElement) {{
        citationsElement.textContent = `Citations: ${{scholarMetrics.totalCitations}}`;
    }}
    
    // Update last updated date
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {{
        const date = new Date(scholarMetrics.lastUpdated);
        lastUpdatedElement.textContent = date.toLocaleDateString();
    }}
    
    // Update any other elements that might exist
    const i10Element = document.getElementById('i10-index');
    if (i10Element) {{
        i10Element.textContent = `i10-index: ${{scholarMetrics.i10Index}}`;
    }}
    
    const pubCountElement = document.getElementById('pub-count');
    if (pubCountElement) {{
        pubCountElement.textContent = `Publications: ${{scholarMetrics.publicationsCount}}`;
    }}
    
    // Log success
    console.log('Scholar metrics updated:', scholarMetrics);
}}

// Auto-update when the DOM is ready
if (document.readyState === 'loading') {{
    document.addEventListener('DOMContentLoaded', updateScholarMetrics);
}} else {{
    updateScholarMetrics();
}}

// Also update if the script is loaded after page load
setTimeout(updateScholarMetrics, 100);
"""
        
        with open(filepath, 'w') as f:
            f.write(js_content)
        print(f"✅ JavaScript file created: {filename}")
        return True
    except Exception as e:
        print(f"❌ Error creating JavaScript file: {e}")
        return False

def main():
    """
    Main function to fetch and save metrics.
    """
    print("=" * 60)
    print(f"Google Scholar Metrics Updater")
    print(f"Author: {AUTHOR_NAME}")
    print(f"Scholar ID: {GOOGLE_SCHOLAR_ID}")
    print("=" * 60)
    
    # Try to fetch metrics from various sources
    metrics = None
    
    # Try Semantic Scholar first
    print("\n📊 Attempting to fetch from Semantic Scholar API...")
    metrics = fetch_semantic_scholar_metrics()
    
    # Try CrossRef for additional data
    print("\n📊 Fetching additional data from CrossRef...")
    crossref_data = fetch_crossref_metrics()
    if crossref_data and metrics:
        # Add CrossRef data as supplementary info
        metrics.update(crossref_data)
    
    # Use fallback if needed
    if not metrics:
        print("\n⚠️ Using fallback metrics...")
        metrics = get_fallback_metrics()
    
    # Save the metrics
    print("\n💾 Saving metrics...")
    json_success = save_metrics_to_json(metrics)
    js_success = create_javascript_file(metrics)
    
    if json_success and js_success:
        print("\n✅ All files created successfully!")
        print(f"   - scholar_metrics.json")
        print(f"   - scholar_metrics.js")
        print("\n📈 Current Metrics:")
        print(f"   H-index: {metrics.get('h_index', 'N/A')}")
        print(f"   Citations: {metrics.get('total_citations', 'N/A')}")
        print(f"   Publications: {metrics.get('publications_count', 'N/A')}")
        print(f"   Source: {metrics.get('source', 'Unknown')}")
        sys.exit(0)
    else:
        print("\n❌ Some files failed to create")
        sys.exit(1)

if __name__ == "__main__":
    main()