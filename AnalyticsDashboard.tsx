import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from 'recharts';
import {
    Box, Typography, Paper, Grid, CircularProgress,
    Card, CardContent, Divider, Chip,
    FormControl, Select, MenuItem
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import CodeIcon from '@mui/icons-material/Code';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot';

// Use same colors as GitHub for languages if possible, else generic palette
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// In development, frontend runs on 5173 but backend (Docker) runs on 4000
const isDevelopment = window.location.port === '5173';
const backendPort = isDevelopment ? '4000' : window.location.port;
const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:${backendPort}`;

export default function AnalyticsDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('1y');
    const [activityData, setActivityData] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        fetchActivity(timeRange);
    }, [timeRange]);

    const fetchActivity = async (range) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/analytics/activity?range=${range}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            setActivityData(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch activity", err);
            setActivityData([]);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE_URL}/api/analytics/summary`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
            });
            setData(res.data);
            // Default to 1y which is what summary returned previously, but now we fetch separately
        } catch (err) {
            console.error("Failed to fetch analytics", err);
            setError("Failed to load analytics data.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (error) return <Typography color="error" sx={{ p: 4 }}>{error}</Typography>;
    if (!data) return null;

    return (
        <Box sx={{ p: 3, maxWidth: 1200, margin: '0 auto' }}>
            <Typography variant="h4" sx={{ mb: 4, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 2 }}>
                <TrendingUpIcon fontSize="large" color="primary" />
                Trends & Insights
            </Typography>

            <Grid container spacing={3}>
                {/* Summary Cards */}
                <Grid item xs={12} md={4}>
                    <SummaryCard
                        title="Total Stars"
                        value={data.totalStars}
                        icon={<ScatterPlotIcon />}
                        color="#0088FE"
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <SummaryCard
                        title="Top Language"
                        value={(data.topLanguages || [])[0]?.name || 'N/A'}
                        icon={<CodeIcon />}
                        color="#00C49F"
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <SummaryCard
                        title="Top Tag"
                        value={(data.topTags || [])[0]?.name || 'N/A'}
                        icon={<TrendingUpIcon />}
                        color="#FFBB28"
                    />
                </Grid>

                {/* Charts Row 1 */}
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" gutterBottom>Language Distribution</Typography>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.topLanguages || []}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {(data.topLanguages || []).map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">Starring Activity</Typography>
                            <FormControl size="small" variant="outlined">
                                <Select
                                    value={timeRange}
                                    onChange={(e) => setTimeRange(e.target.value)}
                                    sx={{ height: 32, fontSize: '0.875rem' }}
                                >
                                    <MenuItem value="1m">Last Month</MenuItem>
                                    <MenuItem value="1y">Last Year</MenuItem>
                                    <MenuItem value="all">First Star to Present</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={activityData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <RechartsTooltip />
                                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>

                {/* Top Tags - Bar Chart */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3, height: 400, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h6" gutterBottom>Top Topics & Tags</Typography>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.topTags || []} layout="vertical" margin={{ left: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={120}
                                    tick={{ fill: '#8b949e', fontSize: 12 }}
                                    interval={0}
                                />
                                <RechartsTooltip />
                                <Bar dataKey="value" fill="#82ca9d" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}

function SummaryCard({ title, value, icon, color }) {
    return (
        <Card sx={{ height: '100%' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', p: 3 }}>
                <Box sx={{
                    p: 2,
                    borderRadius: '50%',
                    backgroundColor: `${color}20`,
                    color: color,
                    mr: 3,
                    display: 'flex'
                }}>
                    {React.cloneElement(icon, { fontSize: "large" })}
                </Box>
                <Box>
                    <Typography color="textSecondary" variant="body2" sx={{ mb: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
                        {title}
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                        {value}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
}
