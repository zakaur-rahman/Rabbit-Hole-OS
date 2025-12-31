/**
 * AST Store — State Management for Document AST Editor
 * 
 * Manages the document AST, selection state, and validation status.
 */
import { create } from 'zustand';

// ============================================================
// TYPE DEFINITIONS (mirroring backend Pydantic models)
// ============================================================

export interface ParagraphData {
  text: string;
  citations: string[];
}

export interface ListData {
  ordered: boolean;
  items: string[];
}

export interface TableData {
  caption: string;
  columns: string[];
  rows: string[][];
  source_refs: string[];
}

export interface FigureData {
  path: string;
  caption: string;
  source_refs: string[];
}

export interface QuoteData {
  text: string;
  source_refs: string[];
}

export interface WarningData {
  text: string;
}

export type BlockType = 'paragraph' | 'list' | 'table' | 'figure' | 'quote' | 'warning';

export interface Block {
  id: string;
  type: BlockType;
  data: ParagraphData | ListData | TableData | FigureData | QuoteData | WarningData;
}

export interface Section {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  content: Block[];
  subsections: Section[];
}

export interface Reference {
  id: string;
  title: string;
  url: string;
}

export interface DocumentAST {
  title: string;
  subtitle: string | null;
  authors: string[];
  date: string;
  abstract: string;
  sections: Section[];
  references: Reference[];
}

export interface ValidationStatus {
  schema: boolean;
  citations: boolean;
  compile: boolean;
  errors: string[];
}

// ============================================================
// STORE INTERFACE
// ============================================================

interface ASTStore {
  // State
  document: DocumentAST | null;
  originalDocument: DocumentAST | null;  // For diff comparison
  selectedSectionId: string | null;
  validationStatus: ValidationStatus;
  isLoading: boolean;
  isDirty: boolean;
  
  // Actions
  setDocument: (doc: DocumentAST) => void;
  selectSection: (id: string | null) => void;
  
  // Section operations
  updateSectionTitle: (id: string, title: string) => void;
  updateSectionContent: (id: string, content: Block[]) => void;
  reorderSections: (parentId: string | null, newOrder: string[]) => void;
  addSection: (parentId: string | null, section: Section) => void;
  deleteSection: (id: string) => void;
  
  // Block operations
  addBlock: (sectionId: string, block: Block) => void;
  updateBlock: (sectionId: string, blockId: string, block: Block) => void;
  removeBlock: (sectionId: string, blockId: string) => void;
  reorderBlocks: (sectionId: string, newOrder: string[]) => void;
  
  // Reference operations
  addReference: (ref: Reference) => void;
  removeReference: (id: string) => void;
  
  // Document operations
  updateTitle: (title: string) => void;
  updateAbstract: (abstract: string) => void;
  
  // Validation
  validate: () => ValidationStatus;
  setValidationStatus: (status: ValidationStatus) => void;
  
  // Utilities
  reset: () => void;
  getSection: (id: string) => Section | null;
  getSectionPath: (id: string) => string[];
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function findSectionById(sections: Section[], id: string): Section | null {
  for (const section of sections) {
    if (section.id === id) return section;
    const found = findSectionById(section.subsections, id);
    if (found) return found;
  }
  return null;
}

function updateSectionInTree(sections: Section[], id: string, updater: (s: Section) => Section): Section[] {
  return sections.map(section => {
    if (section.id === id) {
      return updater(section);
    }
    return {
      ...section,
      subsections: updateSectionInTree(section.subsections, id, updater)
    };
  });
}

function deleteSectionFromTree(sections: Section[], id: string): Section[] {
  return sections
    .filter(s => s.id !== id)
    .map(section => ({
      ...section,
      subsections: deleteSectionFromTree(section.subsections, id)
    }));
}

function validateDocument(doc: DocumentAST): ValidationStatus {
  const errors: string[] = [];
  let schemaValid = true;
  let citationsValid = true;
  
  // Check required fields
  if (!doc.title) {
    errors.push('Document title is required');
    schemaValid = false;
  }
  
  // Collect all reference IDs
  const refIds = new Set(doc.references.map(r => r.id));
  
  // Check citations in content
  function checkBlock(block: Block): void {
    if (block.type === 'paragraph') {
      const data = block.data as ParagraphData;
      for (const cit of data.citations) {
        if (!refIds.has(cit)) {
          errors.push(`Orphaned citation: [${cit}]`);
          citationsValid = false;
        }
      }
    } else if (block.type === 'table' || block.type === 'figure' || block.type === 'quote') {
      const data = block.data as { source_refs?: string[] };
      for (const ref of data.source_refs || []) {
        if (!refIds.has(ref)) {
          errors.push(`Orphaned reference: [${ref}]`);
          citationsValid = false;
        }
      }
    }
  }
  
  function checkSection(section: Section): void {
    if (!section.title) {
      errors.push(`Section ${section.id} has no title`);
      schemaValid = false;
    }
    if (section.content.length === 0 && section.subsections.length === 0) {
      errors.push(`Section "${section.title}" is empty`);
    }
    section.content.forEach(checkBlock);
    section.subsections.forEach(checkSection);
  }
  
  doc.sections.forEach(checkSection);
  
  return {
    schema: schemaValid,
    citations: citationsValid,
    compile: schemaValid && citationsValid,
    errors
  };
}

// ============================================================
// STORE IMPLEMENTATION
// ============================================================

export const useASTStore = create<ASTStore>((set, get) => ({
  // Initial state
  document: null,
  originalDocument: null,
  selectedSectionId: null,
  validationStatus: { schema: true, citations: true, compile: true, errors: [] },
  isLoading: false,
  isDirty: false,
  
  // Set document
  setDocument: (doc) => set({
    document: doc,
    originalDocument: JSON.parse(JSON.stringify(doc)),  // Deep clone
    isDirty: false,
    validationStatus: validateDocument(doc)
  }),
  
  // Select section
  selectSection: (id) => set({ selectedSectionId: id }),
  
  // Update section title
  updateSectionTitle: (id, title) => set(state => {
    if (!state.document) return state;
    return {
      document: {
        ...state.document,
        sections: updateSectionInTree(state.document.sections, id, s => ({ ...s, title }))
      },
      isDirty: true
    };
  }),
  
  // Update section content
  updateSectionContent: (id, content) => set(state => {
    if (!state.document) return state;
    return {
      document: {
        ...state.document,
        sections: updateSectionInTree(state.document.sections, id, s => ({ ...s, content }))
      },
      isDirty: true
    };
  }),
  
  // Reorder sections
  reorderSections: (parentId, newOrder) => set(state => {
    if (!state.document) return state;
    
    if (parentId === null) {
      // Reorder top-level sections
      const orderedSections = newOrder
        .map(id => state.document!.sections.find(s => s.id === id))
        .filter(Boolean) as Section[];
      
      return {
        document: { ...state.document, sections: orderedSections },
        isDirty: true
      };
    }
    
    return {
      document: {
        ...state.document,
        sections: updateSectionInTree(state.document.sections, parentId, s => ({
          ...s,
          subsections: newOrder
            .map(id => s.subsections.find(sub => sub.id === id))
            .filter(Boolean) as Section[]
        }))
      },
      isDirty: true
    };
  }),
  
  // Add section
  addSection: (parentId, section) => set(state => {
    if (!state.document) return state;
    
    if (parentId === null) {
      return {
        document: {
          ...state.document,
          sections: [...state.document.sections, section]
        },
        isDirty: true
      };
    }
    
    return {
      document: {
        ...state.document,
        sections: updateSectionInTree(state.document.sections, parentId, s => ({
          ...s,
          subsections: [...s.subsections, section]
        }))
      },
      isDirty: true
    };
  }),
  
  // Delete section
  deleteSection: (id) => set(state => {
    if (!state.document) return state;
    return {
      document: {
        ...state.document,
        sections: deleteSectionFromTree(state.document.sections, id)
      },
      isDirty: true,
      selectedSectionId: state.selectedSectionId === id ? null : state.selectedSectionId
    };
  }),
  
  // Add block
  addBlock: (sectionId, block) => set(state => {
    if (!state.document) return state;
    return {
      document: {
        ...state.document,
        sections: updateSectionInTree(state.document.sections, sectionId, s => ({
          ...s,
          content: [...s.content, block]
        }))
      },
      isDirty: true
    };
  }),
  
  // Update block
  updateBlock: (sectionId, blockId, block) => set(state => {
    if (!state.document) return state;
    return {
      document: {
        ...state.document,
        sections: updateSectionInTree(state.document.sections, sectionId, s => ({
          ...s,
          content: s.content.map(b => b.id === blockId ? block : b)
        }))
      },
      isDirty: true
    };
  }),
  
  // Remove block
  removeBlock: (sectionId, blockId) => set(state => {
    if (!state.document) return state;
    return {
      document: {
        ...state.document,
        sections: updateSectionInTree(state.document.sections, sectionId, s => ({
          ...s,
          content: s.content.filter(b => b.id !== blockId)
        }))
      },
      isDirty: true
    };
  }),
  
  // Reorder blocks
  reorderBlocks: (sectionId, newOrder) => set(state => {
    if (!state.document) return state;
    return {
      document: {
        ...state.document,
        sections: updateSectionInTree(state.document.sections, sectionId, s => ({
          ...s,
          content: newOrder.map(id => s.content.find(b => b.id === id)).filter(Boolean) as Block[]
        }))
      },
      isDirty: true
    };
  }),
  
  // Add reference
  addReference: (ref) => set(state => {
    if (!state.document) return state;
    return {
      document: {
        ...state.document,
        references: [...state.document.references, ref]
      },
      isDirty: true
    };
  }),
  
  // Remove reference
  removeReference: (id) => set(state => {
    if (!state.document) return state;
    return {
      document: {
        ...state.document,
        references: state.document.references.filter(r => r.id !== id)
      },
      isDirty: true
    };
  }),
  
  // Update title
  updateTitle: (title) => set(state => {
    if (!state.document) return state;
    return {
      document: { ...state.document, title },
      isDirty: true
    };
  }),
  
  // Update abstract
  updateAbstract: (abstract) => set(state => {
    if (!state.document) return state;
    return {
      document: { ...state.document, abstract },
      isDirty: true
    };
  }),
  
  // Validate
  validate: () => {
    const state = get();
    if (!state.document) {
      return { schema: false, citations: false, compile: false, errors: ['No document'] };
    }
    const status = validateDocument(state.document);
    set({ validationStatus: status });
    return status;
  },
  
  // Set validation status
  setValidationStatus: (status) => set({ validationStatus: status }),
  
  // Reset
  reset: () => set({
    document: null,
    originalDocument: null,
    selectedSectionId: null,
    validationStatus: { schema: true, citations: true, compile: true, errors: [] },
    isLoading: false,
    isDirty: false
  }),
  
  // Get section by ID
  getSection: (id) => {
    const state = get();
    if (!state.document) return null;
    return findSectionById(state.document.sections, id);
  },
  
  // Get section path
  getSectionPath: (id) => {
    const state = get();
    if (!state.document) return [];
    
    function findPath(sections: Section[], targetId: string, path: string[]): string[] | null {
      for (const section of sections) {
        if (section.id === targetId) {
          return [...path, section.id];
        }
        const found = findPath(section.subsections, targetId, [...path, section.id]);
        if (found) return found;
      }
      return null;
    }
    
    return findPath(state.document.sections, id, []) || [];
  }
}));
