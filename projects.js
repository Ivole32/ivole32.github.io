// Projects Page JavaScript

const GITHUB_API_BASE = 'https://api.github.com/repos/';

// GitHub API rate limit cache
let apiCache = {};

// Global state
let allProjects = [];
let filteredProjects = [];
let activeFilters = new Set();
let searchQuery = '';

async function loadProjects() {
    const loadingEl = document.getElementById('loading');
    const containerEl = document.getElementById('projects-container');
    const errorEl = document.getElementById('error-message');

    try {
        // Load projects configuration from JSON
        const response = await fetch('projects.json');
        if (!response.ok) throw new Error('Failed to load projects.json');
        
        const data = await response.json();
        const projects = data.projects;
        
        // Sort projects by order
        projects.sort((a, b) => a.order - b.order);
        
        // Load GitHub data for each project
        const projectsWithGitHubData = await Promise.all(
            projects.map(async (project) => {
                try {
                    const githubData = await fetchGitHubData(project.github_repo);
                    return { ...project, githubData };
                } catch (error) {
                    console.warn(`Failed to load GitHub data for ${project.github_repo}:`, error);
                    return { ...project, githubData: null };
                }
            })
        );
        
        // Store projects globally
        allProjects = projectsWithGitHubData;
        filteredProjects = projectsWithGitHubData;
        
        // Initialize search and filters
        initializeSearch();
        initializeFilters();
        
        // Render projects
        renderProjects(filteredProjects, containerEl);
        
        // Show container, hide loading
        loadingEl.style.display = 'none';
        containerEl.style.display = 'grid';
        
    } catch (error) {
        console.error('Error loading projects:', error);
        loadingEl.style.display = 'none';
        errorEl.style.display = 'block';
    }
}

async function fetchGitHubData(repo) {
    // Check cache first
    if (apiCache[repo]) {
        return apiCache[repo];
    }
    
    const response = await fetch(`${GITHUB_API_BASE}${repo}`);
    if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the result
    apiCache[repo] = {
        stars: data.stargazers_count,
        forks: data.forks_count,
        language: data.language,
        url: data.html_url,
        homepage: data.homepage,
        updated: data.updated_at
    };
    
    return apiCache[repo];
}

function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        clearBtn.style.display = searchQuery ? 'block' : 'none';
        applyFilters();
    });
    
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearBtn.style.display = 'none';
        applyFilters();
    });
}

function initializeFilters() {
    const filterTagsContainer = document.getElementById('filterTags');
    
    // Collect all unique tags
    const allTags = new Set();
    allProjects.forEach(project => {
        if (project.tags) {
            project.tags.forEach(tag => allTags.add(tag));
        }
    });
    
    // Create filter buttons
    Array.from(allTags).sort().forEach(tag => {
        const filterBtn = document.createElement('button');
        filterBtn.className = 'filter-tag';
        filterBtn.textContent = tag;
        filterBtn.addEventListener('click', () => toggleFilter(tag, filterBtn));
        filterTagsContainer.appendChild(filterBtn);
    });
}

function toggleFilter(tag, button) {
    if (activeFilters.has(tag)) {
        activeFilters.delete(tag);
        button.classList.remove('active');
    } else {
        activeFilters.add(tag);
        button.classList.add('active');
    }
    applyFilters();
}

function applyFilters() {
    const container = document.getElementById('projects-container');
    const resultsCount = document.getElementById('resultsCount');
    const resultText = document.getElementById('resultText');
    
    // Filter by search query and active tag filters
    filteredProjects = allProjects.filter(project => {
        // Search filter
        const matchesSearch = !searchQuery || 
            project.name.toLowerCase().includes(searchQuery) ||
            (project.description && project.description.toLowerCase().includes(searchQuery)) ||
            (project.tags && project.tags.some(tag => tag.toLowerCase().includes(searchQuery)));
        
        // Tag filter
        const matchesTags = activeFilters.size === 0 ||
            (project.tags && project.tags.some(tag => activeFilters.has(tag)));
        
        return matchesSearch && matchesTags;
    });
    
    // Update results count
    if (searchQuery || activeFilters.size > 0) {
        resultsCount.style.display = 'block';
        const count = filteredProjects.length;
        resultText.textContent = `${count} project${count !== 1 ? 's' : ''} found`;
    } else {
        resultsCount.style.display = 'none';
    }
    
    // Render filtered projects
    renderProjects(filteredProjects, container);
}

function renderProjects(projects, container) {
    container.innerHTML = '';
    
    if (projects.length === 0) {
        container.innerHTML = `
            <div class="no-results">
                <h3>No projects found</h3>
                <p>Try adjusting your search or filter criteria</p>
            </div>
        `;
        return;
    }
    
    projects.forEach(project => {
        const card = createProjectCard(project);
        container.appendChild(card);
    });
}

function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = `project-card ${project.featured ? 'featured' : ''}`;
    
    const githubData = project.githubData;
    
    card.innerHTML = `
        <div class="project-header">
            <h3 class="project-title">${escapeHtml(project.name)}</h3>
            ${project.featured ? '<span class="featured-badge">Featured</span>' : ''}
        </div>
        
        <p class="project-description">${escapeHtml(project.description)}</p>
        
        ${project.organization || (project.contributors && project.contributors.length > 0) ? `
            <div class="project-meta">
                ${project.organization ? `
                    <div class="project-organization">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span><strong>Organization:</strong> ${escapeHtml(project.organization)}</span>
                    </div>
                ` : ''}
                
                ${project.contributors && project.contributors.length > 0 ? `
                    <div class="project-contributors">
                        <span class="contributors-label">Contributors:</span>
                        <div class="contributors-list">
                            ${project.contributors.map(contributor => `
                                <a href="https://github.com/${escapeHtml(contributor.github)}" 
                                   target="_blank" 
                                   rel="noopener noreferrer external" 
                                   class="contributor"
                                   aria-label="${escapeHtml(contributor.name)} on GitHub">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                    </svg>
                                    <span>${escapeHtml(contributor.name)}</span>
                                    ${contributor.role ? `<span class="contributor-role">(${escapeHtml(contributor.role)})</span>` : ''}
                                </a>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        ` : ''}
        
        ${project.tags && project.tags.length > 0 ? `
            <div class="project-tags">
                ${project.tags.map(tag => `<span class="project-tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
        ` : ''}
        
        ${githubData ? `
            <div class="project-stats">
                <div class="project-stat">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                    <span>${githubData.stars}</span>
                </div>
                <div class="project-stat">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v6m0 6v6"></path>
                        <path d="M17.2 2.8l-4.2 4.2m0 6l-4.2 4.2m12.4 0l-4.2-4.2m0-6l-4.2-4.2"></path>
                    </svg>
                    <span>${githubData.forks}</span>
                </div>
                ${githubData.language ? `
                    <div class="project-stat">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="16 18 22 12 16 6"></polyline>
                            <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                        <span>${escapeHtml(githubData.language)}</span>
                    </div>
                ` : ''}
            </div>
        ` : ''}
        
        <div class="project-actions">
            <a href="${githubData ? githubData.url : `https://github.com/${project.github_repo}`}" 
               target="_blank" 
               rel="noopener noreferrer external" 
               class="project-btn project-btn-primary github-btn"
               aria-label="View ${escapeHtml(project.name)} on GitHub">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>View on GitHub</span>
            </a>
        </div>
    `;
    
    // Make entire card clickable if detailPage exists
    if (project.detailPage) {
        card.style.cursor = 'pointer';
        card.addEventListener('click', (e) => {
            // Check if click is on a link or button
            if (e.target.closest('a') || e.target.closest('button')) {
                return;
            }
            window.location.href = project.detailPage;
        });
    }
    
    return card;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load projects when page loads
document.addEventListener('DOMContentLoaded', loadProjects);
