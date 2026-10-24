/**
 * LoadMoreFooter — sonsuz kaydırmada sonraki sayfa yüklenirken liste altındaki gösterge
 *
 * Kullanım: <FlatList ... ListFooterComponent={<LoadMoreFooter loading={list.loadingMore} />} />
 */

import React from 'react';
import { ActivityIndicator } from 'react-native';

import { colors, spacing } from '../../theme';

const LoadMoreFooter: React.FC<{ loading: boolean }> = ({ loading }) =>
  loading ? <ActivityIndicator style={{ marginVertical: spacing.md }} color={colors.primary} /> : null;

export default LoadMoreFooter;
