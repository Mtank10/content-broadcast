import type { PaginationMeta } from '../types';

const DEFAULT_PAGE_SIZE = parseInt(process.env.DEFAULT_PAGE_SIZE ?? '20', 10);
const MAX_PAGE_SIZE = parseInt(process.env.MAX_PAGE_SIZE ?? '100', 10);

export interface ParsedPagination {
  page: number;
  limit: number;
  offset: number;
}

export const parsePagination = (
  page?: number,
  limit?: number
): ParsedPagination => {
  const safePage = Math.max(1, page ?? 1);
  const safeLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, limit ?? DEFAULT_PAGE_SIZE));
  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit,
  };
};


export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};
