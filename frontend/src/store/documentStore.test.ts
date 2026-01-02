/**
 * DocumentStore Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDocumentStore, Document } from './documentStore';

// Mock storage module
vi.mock('../lib/storage', () => ({
  getCollection: vi.fn(() => []),
  saveCollection: vi.fn(),
}));

const mockDocument: Document = {
  id: 'doc-1',
  name: 'Test Document',
  category: 'manual',
  fileType: 'pdf',
  uploadDate: '2024-01-15',
  description: 'Test description',
  tags: ['test', 'document'],
};

describe('documentStore', () => {
  beforeEach(() => {
    // Reset store to clean state
    useDocumentStore.setState({
      documents: [],
      isLoading: false,
    });
  });

  describe('setDocuments', () => {
    it('should set documents array', () => {
      const docs = [mockDocument];
      useDocumentStore.getState().setDocuments(docs);
      
      expect(useDocumentStore.getState().documents).toEqual(docs);
    });

    it('should replace existing documents', () => {
      useDocumentStore.setState({ documents: [mockDocument] });
      
      const newDoc: Document = { ...mockDocument, id: 'doc-2', name: 'New Doc' };
      useDocumentStore.getState().setDocuments([newDoc]);
      
      expect(useDocumentStore.getState().documents).toHaveLength(1);
      expect(useDocumentStore.getState().documents[0].id).toBe('doc-2');
    });
  });

  describe('addDocument', () => {
    it('should add a document to the list', () => {
      useDocumentStore.getState().addDocument(mockDocument);
      
      expect(useDocumentStore.getState().documents).toHaveLength(1);
      expect(useDocumentStore.getState().documents[0]).toEqual(mockDocument);
    });

    it('should append to existing documents', () => {
      useDocumentStore.setState({ documents: [mockDocument] });
      
      const newDoc: Document = { ...mockDocument, id: 'doc-2', name: 'Second Doc' };
      useDocumentStore.getState().addDocument(newDoc);
      
      expect(useDocumentStore.getState().documents).toHaveLength(2);
    });
  });

  describe('updateDocument', () => {
    it('should update document by id', () => {
      useDocumentStore.setState({ documents: [mockDocument] });
      
      useDocumentStore.getState().updateDocument('doc-1', { name: 'Updated Name' });
      
      expect(useDocumentStore.getState().documents[0].name).toBe('Updated Name');
    });

    it('should not affect other documents', () => {
      const doc2: Document = { ...mockDocument, id: 'doc-2', name: 'Doc 2' };
      useDocumentStore.setState({ documents: [mockDocument, doc2] });
      
      useDocumentStore.getState().updateDocument('doc-1', { name: 'Updated' });
      
      expect(useDocumentStore.getState().documents[1].name).toBe('Doc 2');
    });

    it('should do nothing if id not found', () => {
      useDocumentStore.setState({ documents: [mockDocument] });
      
      useDocumentStore.getState().updateDocument('non-existent', { name: 'Updated' });
      
      expect(useDocumentStore.getState().documents[0].name).toBe('Test Document');
    });
  });

  describe('deleteDocument', () => {
    it('should remove document by id', () => {
      useDocumentStore.setState({ documents: [mockDocument] });
      
      useDocumentStore.getState().deleteDocument('doc-1');
      
      expect(useDocumentStore.getState().documents).toHaveLength(0);
    });

    it('should only remove matching document', () => {
      const doc2: Document = { ...mockDocument, id: 'doc-2' };
      useDocumentStore.setState({ documents: [mockDocument, doc2] });
      
      useDocumentStore.getState().deleteDocument('doc-1');
      
      expect(useDocumentStore.getState().documents).toHaveLength(1);
      expect(useDocumentStore.getState().documents[0].id).toBe('doc-2');
    });
  });

  describe('searchDocuments', () => {
    beforeEach(() => {
      const docs: Document[] = [
        { ...mockDocument, id: '1', name: 'Samsung Manual', tags: ['appliance'] },
        { ...mockDocument, id: '2', name: 'Invoice Receipt', description: 'Kitchen purchase' },
        { ...mockDocument, id: '3', name: 'Warranty Card', ocrText: 'Samsung warranty info' },
      ];
      useDocumentStore.setState({ documents: docs });
    });

    it('should find documents by name', () => {
      const results = useDocumentStore.getState().searchDocuments('Samsung');
      
      expect(results).toHaveLength(2); // Name match + OCR match
    });

    it('should find documents by description', () => {
      const results = useDocumentStore.getState().searchDocuments('Kitchen');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('2');
    });

    it('should find documents by tags', () => {
      const results = useDocumentStore.getState().searchDocuments('appliance');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('1');
    });

    it('should find documents by OCR text', () => {
      const results = useDocumentStore.getState().searchDocuments('warranty info');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('3');
    });

    it('should be case insensitive', () => {
      const results = useDocumentStore.getState().searchDocuments('SAMSUNG');
      
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const results = useDocumentStore.getState().searchDocuments('nonexistent');
      
      expect(results).toHaveLength(0);
    });
  });

  describe('getDocumentsByCategory', () => {
    beforeEach(() => {
      const docs: Document[] = [
        { ...mockDocument, id: '1', category: 'manual' },
        { ...mockDocument, id: '2', category: 'receipt' },
        { ...mockDocument, id: '3', category: 'manual' },
      ];
      useDocumentStore.setState({ documents: docs });
    });

    it('should filter by category', () => {
      const manuals = useDocumentStore.getState().getDocumentsByCategory('manual');
      
      expect(manuals).toHaveLength(2);
    });

    it('should return empty array for category with no docs', () => {
      const warranties = useDocumentStore.getState().getDocumentsByCategory('warranty');
      
      expect(warranties).toHaveLength(0);
    });
  });

  describe('getDocumentsByRelation', () => {
    beforeEach(() => {
      const docs: Document[] = [
        { ...mockDocument, id: '1', relatedTo: 'item-1', relatedType: 'item' },
        { ...mockDocument, id: '2', relatedTo: 'item-1', relatedType: 'item' },
        { ...mockDocument, id: '3', relatedTo: 'project-1', relatedType: 'project' },
      ];
      useDocumentStore.setState({ documents: docs });
    });

    it('should filter by relation', () => {
      const itemDocs = useDocumentStore.getState().getDocumentsByRelation('item-1', 'item');
      
      expect(itemDocs).toHaveLength(2);
    });

    it('should match both id and type', () => {
      const results = useDocumentStore.getState().getDocumentsByRelation('item-1', 'project');
      
      expect(results).toHaveLength(0);
    });
  });
});
