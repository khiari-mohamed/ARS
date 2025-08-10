import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Paper,
  LinearProgress
} from '@mui/material';
import {
  Search,
  ExpandMore,
  FilterList,
  Description,
  Star,
  AccessTime,
  Person
} from '@mui/icons-material';
import { performAdvancedSearch, getSearchSuggestions } from '../../services/gedService';

interface SearchFacet {
  field: string;
  label: string;
  values: { value: string; count: number; label?: string }[];
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  type: string;
  category: string;
  tags: string[];
  createdAt: Date;
  author: string;
  score: number;
  highlights: { [key: string]: string[] };
}

const AdvancedSearchInterface: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [facets, setFacets] = useState<SearchFacet[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<{ [key: string]: string[] }>({});
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchTime, setSearchTime] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');

  useEffect(() => {
    if (query.length > 2) {
      loadSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [query]);

  const loadSuggestions = async () => {
    try {
      const suggestions = await getSearchSuggestions(query);
      setSuggestions(suggestions);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const searchQuery = {
        query,
        filters: selectedFilters,
        facets: ['type', 'category', 'author', 'createdAt'],
        sort: { field: sortBy === 'relevance' ? 'score' : sortBy, direction: 'desc' as const },
        page: 1,
        size: 20
      };

      const response = await performAdvancedSearch(searchQuery);
      setResults(response.results);
      setFacets(response.facets);
      setTotal(response.total);
      setSearchTime(response.took);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (facetField: string, value: string, checked: boolean) => {
    setSelectedFilters(prev => {
      const currentValues = prev[facetField] || [];
      if (checked) {
        return { ...prev, [facetField]: [...currentValues, value] };
      } else {
        return { ...prev, [facetField]: currentValues.filter(v => v !== value) };
      }
    });
  };

  const clearFilters = () => {
    setSelectedFilters({});
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CONTRACT': return '📄';
      case 'BS': return '🏥';
      case 'FACTURE': return '💰';
      case 'COURRIER': return '✉️';
      default: return '📋';
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const highlightText = (text: string, highlights?: string[]) => {
    if (!highlights || highlights.length === 0) return text;
    
    // Simple highlight implementation
    let highlightedText = text;
    highlights.forEach(highlight => {
      const cleanHighlight = highlight.replace(/<\/?em>/g, '');
      highlightedText = highlightedText.replace(
        new RegExp(cleanHighlight, 'gi'),
        `<mark>${cleanHighlight}</mark>`
      );
    });
    
    return <span dangerouslySetInnerHTML={{ __html: highlightedText }} />;
  };

  return (
    <Box>
      {/* Search Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Recherche Avancée de Documents
        </Typography>
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Rechercher dans les documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>Trier par</InputLabel>
              <Select
                value={sortBy}
                label="Trier par"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="relevance">Pertinence</MenuItem>
                <MenuItem value="createdAt">Date création</MenuItem>
                <MenuItem value="updatedAt">Date modification</MenuItem>
                <MenuItem value="title">Titre</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={handleSearch}
              disabled={loading || !query.trim()}
              sx={{ height: 56 }}
            >
              Rechercher
            </Button>
          </Grid>
        </Grid>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Suggestions:
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap">
              {suggestions.map((suggestion, index) => (
                <Chip
                  key={index}
                  label={suggestion}
                  size="small"
                  onClick={() => {
                    setQuery(suggestion);
                    setSuggestions([]);
                  }}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Paper>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Results and Filters */}
      <Grid container spacing={3}>
        {/* Filters Sidebar */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" display="flex" alignItems="center">
                <FilterList sx={{ mr: 1 }} />
                Filtres
              </Typography>
              {Object.keys(selectedFilters).length > 0 && (
                <Button size="small" onClick={clearFilters}>
                  Effacer
                </Button>
              )}
            </Box>

            {facets.map((facet) => (
              <Accordion key={facet.field} defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMore />}>
                  <Typography variant="subtitle2">{facet.label}</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  {facet.values.map((value) => (
                    <FormControlLabel
                      key={value.value}
                      control={
                        <Checkbox
                          size="small"
                          checked={selectedFilters[facet.field]?.includes(value.value) || false}
                          onChange={(e) => handleFilterChange(facet.field, value.value, e.target.checked)}
                        />
                      }
                      label={
                        <Box display="flex" justifyContent="space-between" width="100%">
                          <span>{value.label || value.value}</span>
                          <Chip label={value.count} size="small" />
                        </Box>
                      }
                      sx={{ width: '100%', m: 0 }}
                    />
                  ))}
                </AccordionDetails>
              </Accordion>
            ))}
          </Paper>
        </Grid>

        {/* Search Results */}
        <Grid item xs={12} md={9}>
          {results.length > 0 && (
            <Box mb={2}>
              <Typography variant="body2" color="text.secondary">
                {total} résultat(s) trouvé(s) en {searchTime}ms
              </Typography>
            </Box>
          )}

          <List>
            {results.map((result, index) => (
              <React.Fragment key={result.id}>
                <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                  <ListItemIcon sx={{ mt: 1 }}>
                    <Typography variant="h6">{getTypeIcon(result.type)}</Typography>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box>
                        <Typography
                          variant="h6"
                          component="div"
                          sx={{ color: 'primary.main', cursor: 'pointer', mb: 1 }}
                        >
                          {highlightText(result.title, result.highlights.title)}
                        </Typography>
                        <Box display="flex" gap={1} mb={1}>
                          <Chip label={result.type} size="small" color="primary" />
                          <Chip label={result.category} size="small" variant="outlined" />
                          {result.tags.map((tag) => (
                            <Chip key={tag} label={tag} size="small" variant="outlined" />
                          ))}
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.primary" paragraph>
                          {highlightText(
                            result.content.substring(0, 200) + '...',
                            result.highlights.content
                          )}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={2} mt={1}>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Person fontSize="small" color="action" />
                            <Typography variant="caption">{result.author}</Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <AccessTime fontSize="small" color="action" />
                            <Typography variant="caption">
                              {formatDate(result.createdAt)}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Star fontSize="small" color="action" />
                            <Typography variant="caption">
                              Score: {(result.score * 100).toFixed(0)}%
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    }
                  />
                </ListItem>
                {index < results.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          {results.length === 0 && !loading && query && (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Description sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Aucun résultat trouvé
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Essayez de modifier votre recherche ou d'ajuster les filtres
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdvancedSearchInterface;