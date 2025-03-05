# ForMyPrinter (FMP) Portfolio Project
By Arinhasvath KEOPHIPHATH

## EXERCISE 0: TEAM FORMATION

### Roles and Responsibilities Overview

```mermaid
graph LR
    id1(Arinhasvath KEOPHIPHATH) --> DevLead[Development Lead]
    id1 --> ProjMan[Project Manager]
    id1 --> QA[Quality Assurance]
    DevLead --> Front[Frontend Dev]
    DevLead --> Back[Backend Dev]
```

### Development Tools and Environment
9308@holbertonstudents.com
| Area | Tools |
|------|-------|
| Development | VS Code, GitHub |
| Project Management | Trello |
| Documentation | Google Workspace |
| Communication | Discord |

### Daily Schedule

```mermaid
journey
    title Daily Workflow
    section Morning
      Planning: 5: Me
      Setup: 5: Me
    section Day
      Development: 5: Me
      Testing: 4: Me
    section Evening
      Review: 5: Me
      Documentation: 4: Me
```

## EXERCISE 1: RESEARCH AND BRAINSTORMING

### Market Research Mind Map

```mermaid
mindmap
    root(ForMyPrinter)
        Products
            OEM Cartridges
            Compatible Cartridges
            Recycled Cartridges
        Customers
            Small Business
            Home Office
            Educational
        Features
            Easy Search
            Quick Order
            Recycling Program
```

### SCAMPER Analysis

| Category | Application |
|----------|-------------|
| Substitute | Replace physical store with e-commerce |
| Combine | Merge ordering with recycling program |
| Adapt | Customize for different printer brands |
| Modify | Enhance search and ordering process |
| Put to other use | Convert used cartridges into recycled ones |
| Eliminate | Remove complex ordering steps |
| Reverse | Implement subscription-first approach |

### "How Might We" Questions

```mermaid
graph TD
    A[How Might We] --> B[Make cartridge selection easier?]
    A --> C[Reduce environmental impact?]
    A --> D[Ensure product quality?]
    A --> E[Optimize pricing?]
```

## EXERCISE 2: IDEA EVALUATION

### Evaluation Matrix

| Criteria | Score (1-5) | Notes |
|----------|-------------|-------|
| Technical Feasibility | 4 | Standard e-commerce stack |
| Market Potential | 5 | Growing eco-friendly market |
| Innovation | 4 | Recycling program integration |
| Resource Requirements | 4 | Solo development manageable |
| Scalability | 5 | Easy to expand product range |

### Risk Assessment

```mermaid
graph TD
    A[Risks] --> B[Technical]
    A --> C[Business]
    A --> D[Market]
    B --> B1[Security]
    B --> B2[Integration]
    C --> C1[Supply Chain]
    C --> C2[Competition]
    D --> D1[Market Changes]
    D --> D2[Customer Behavior]
```

## EXERCISE 3: DECISION AND REFINEMENT

### Selected MVP Features

```mermaid
pie title MVP Feature Priority
    "Product Catalog" : 30
    "Search System" : 25
    "Shopping Cart" : 20
    "User Accounts" : 15
    "Admin Panel" : 10
```

### Technical Architecture

```mermaid
flowchart LR
    A[Frontend] --> B[API Layer]
    B --> C[Backend]
    C --> D[Database]
    C --> E[Payment]
    C --> F[Inventory]
```

## EXERCISE 4: IDEA DEVELOPMENT DOCUMENTATION

### Project Overview

ForMyPrinter (FMP) is an e-commerce platform specializing in printer cartridges, offering three main product lines:
- OEM cartridges
- Compatible cartridges
- Recycled cartridges

### Target Market Segments

```mermaid
pie title Market Distribution
    "Small Businesses" : 40
    "Home Offices" : 30
    "Educational" : 20
    "Individual Users" : 10
```

### Development Timeline

```mermaid
gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1
    Setup           :2024-12-01, 1w
    Basic Frontend  :2024-12-08, 2w
    section Phase 2
    Core Features   :2024-12-22, 2w
    Testing        :2025-01-05, 1w
    section Phase 3
    Launch         :2025-01-12, 1w
```

# Créer un environnement virtuel
python -m venv venv

# Activer l'environnement
# Sur Windows :
venv\Scripts\activate
# Sur Linux/Mac :
source venv/bin/activate

# Installer les dépendances
pip install -r backend/requirements.txt
