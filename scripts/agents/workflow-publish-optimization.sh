#!/bin/bash
# =============================================================================
# WORKFLOW: /admin/publish Multi-Agent Optimization
# =============================================================================
# Usage: ./scripts/agents/workflow-publish-optimization.sh [phase]
# Phases: security | performance | ux | testing | all
# =============================================================================

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR: $1${NC}"
}

# Ensure we're on the right branch
ensure_branch() {
    local branch_name="$1"
    if ! git rev-parse --verify "$branch_name" >/dev/null 2>&1; then
        log "Creating branch: $branch_name"
        git checkout -b "$branch_name"
    else
        log "Switching to branch: $branch_name"
        git checkout "$branch_name"
    fi
}

# =============================================================================
# PHASE 1: SECURITY CRITICAL (Agent Security)
# =============================================================================
phase_security() {
    log "🔐 PHASE 1: SECURITY CRITICAL - Starting Agent Security"
    
    ensure_branch "agent/security-publish-auth"
    
    # Use Codex with security profile
    codex -p agent-security "
    OBJETIVO: Implementar autenticación admin obligatoria para todas las APIs de /admin/publish
    
    TAREAS CRÍTICAS:
    1. Crear adminAuthMiddleware en lib/middleware/admin-auth.middleware.ts
    2. Aplicar middleware a app/api/admin/folders/[id]/publish/route.ts
    3. Aplicar middleware a app/api/admin/folders/published/route.ts
    4. Validar session de Supabase Auth con role=admin
    5. Rate limiting específico para admin APIs
    6. Crear tests de seguridad en __tests__/security/admin-publish.test.ts
    
    CRITERIOS DE ÉXITO:
    - APIs inaccesibles sin auth admin válida
    - Rate limiting funcional (10 req/min por admin)
    - Tests de seguridad pasan al 100%
    - Logs de auditoría implementados
    
    USAR: createServerSupabaseServiceClient solo DESPUÉS de validar admin
    NO TOCAR: Lógica de negocio existente, solo agregar auth layer
    "
    
    # Validate security implementation
    log "Running security tests..."
    npm run test:security || warn "Security tests failed - review implementation"
    
    log "✅ Phase 1 (Security) completed. Review changes before continuing."
}

# =============================================================================
# PHASE 2: PERFORMANCE OPTIMIZATION (Agent Performance)
# =============================================================================
phase_performance() {
    log "⚡ PHASE 2: PERFORMANCE OPTIMIZATION - Starting Agent Performance"
    
    ensure_branch "agent/performance-publish-queries"
    
    # Use Codex with performance profile
    codex -p agent-performance "
    OBJETIVO: Eliminar N+1 queries y optimizar performance frontend/backend
    
    TAREAS CRÍTICAS:
    1. Reescribir query en app/api/admin/folders/published/route.ts:
       - Eliminar Promise.all con N queries individuales
       - Usar JOIN con assets table para photo_count
       - Implementar cursor-based pagination
    
    2. Crear servicio optimizado lib/services/folder-publish.service.ts:
       - Consolidar lógica de publicación
       - Cache de resultados con TTL
       - Batch operations cuando sea posible
    
    3. Frontend performance en app/admin/publish/page.tsx:
       - Implementar React Query para caching
       - Lazy loading de componentes pesados
       - Optimistic updates para UX
       - Debounce de searches optimizado (150ms)
    
    4. Crear índices DB optimizados (SQL scripts):
       - idx_folders_published_performance
       - idx_assets_folder_status
    
    CRITERIOS DE ÉXITO:
    - Eliminar 100% de N+1 queries (una sola query principal)
    - Reducir latencia API en >80% (target: <200ms)
    - Frontend cache hit rate >90%
    - Bundle size impact <10KB adicionales
    
    MEDIR: Usar console.time/timeEnd y métricas de DB
    "
    
    # Performance validation
    log "Running performance benchmarks..."
    npm run test:integration || warn "Integration tests failed"
    
    log "✅ Phase 2 (Performance) completed. Check metrics improvement."
}

# =============================================================================
# PHASE 3: UX IMPROVEMENTS (Agent UX)
# =============================================================================
phase_ux() {
    log "🎨 PHASE 3: UX IMPROVEMENTS - Starting Agent UX"
    
    ensure_branch "agent/ux-publish-mobile"
    
    # Use Task tool with frontend-ui-developer agent
    log "Launching frontend-ui-developer agent for UX improvements..."
    
    # This will be handled by Task tool in the main workflow
    echo "UX_AGENT_TASKS='
    OBJETIVO: Mejorar UX móvil y desktop para /admin/publish
    
    COMPONENTES A MEJORAR:
    1. app/admin/publish/page.tsx - Mobile-first redesign
    2. Crear PhotoPreviewModal.tsx - Preview de fotos en carpetas
    3. Crear PublishSuccessToast.tsx - Feedback visual mejorado
    4. Responsive grid system para folder cards
    
    UX IMPROVEMENTS:
    - Cards más grandes y touch-friendly en móvil
    - Preview de 3-4 fotos por carpeta con lazy loading
    - Estados de loading granulares (por carpeta)
    - Confirmaciones visuales con animaciones
    - URLs amigables: /f/escuela-kinder-a-2024
    - Modo oscuro support
    
    CRITERIOS DE ÉXITO:
    - Mobile usability score >95 (Lighthouse)
    - Touch targets >44px mínimo
    - Loading states < 100ms perceived
    - Accessibility score >98 (WCAG 2.1 AA)
    '" > /tmp/ux_agent_tasks.txt
    
    log "✅ Phase 3 (UX) tasks defined. Will be executed by Task agent."
}

# =============================================================================
# PHASE 4: TESTING & VALIDATION (Agent QA)
# =============================================================================
phase_testing() {
    log "🧪 PHASE 4: TESTING & VALIDATION - Starting Agent QA"
    
    ensure_branch "agent/testing-publish-e2e"
    
    # Use testing-qa-specialist agent
    log "Launching testing-qa-specialist agent..."
    
    echo "QA_AGENT_TASKS='
    OBJETIVO: Testing completo del sistema /admin/publish optimizado
    
    TESTS A CREAR:
    1. __tests__/e2e/admin-publish-workflow.test.ts
       - Flujo completo admin: login → seleccionar evento → publicar carpeta → validar URL
       - Cross-browser testing (Chrome, Firefox, Safari)
       - Mobile responsive testing
    
    2. __tests__/api/admin/publish-security.test.ts
       - Tests de auth: sin token, token inválido, rol no-admin
       - Rate limiting validation
       - Input validation y XSS protection
    
    3. __tests__/performance/publish-api.test.ts
       - Load testing con 100+ carpetas
       - Query performance benchmarks
       - Memory leak detection
    
    4. __tests__/integration/publish-end-to-end.test.ts
       - DB migrations compatibility
       - Fallback scenarios
       - Error handling completo
    
    CRITERIOS DE ÉXITO:
    - Security tests: 100% pass rate
    - E2E tests: <5s execution total
    - Performance: APIs <200ms p95
    - Coverage: >95% para código modificado
    '" > /tmp/qa_agent_tasks.txt
    
    log "Running comprehensive test suite..."
    npm run test:comprehensive || warn "Some tests failed - review before merge"
    
    log "✅ Phase 4 (Testing) completed. Review test results."
}

# =============================================================================
# ORCHESTRATION
# =============================================================================
case "${1:-all}" in
    "security")
        phase_security
        ;;
    "performance") 
        phase_performance
        ;;
    "ux")
        phase_ux
        ;;
    "testing")
        phase_testing
        ;;
    "all")
        log "🚀 STARTING FULL /admin/publish OPTIMIZATION WORKFLOW"
        log "Estimated time: 6-8 hours total"
        
        phase_security
        sleep 2
        phase_performance  
        sleep 2
        phase_ux
        sleep 2
        phase_testing
        
        log "🎉 ALL PHASES COMPLETED!"
        log "Next steps:"
        log "1. Review all branches: git branch --list 'agent/*'"
        log "2. Merge to main: git checkout main && git merge agent/security-publish-auth"
        log "3. Deploy to staging for validation"
        ;;
    *)
        error "Usage: $0 [security|performance|ux|testing|all]"
        exit 1
        ;;
esac