import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet
} from 'react-native';
import Icon from '../components/Icon';
import OrderItem from '../components/order/OrderItem';

const OrdersScreen = ({
  useRealApi,
  searchQuery,
  setSearchQuery,
  filteredOrders,
  isLoadingOrders,
  refreshing,
  onRefresh,
  onUpdateStatus,
  onShowPreview,
  onPrint,
  onShowFilters,
  statusFilter
}) => {
  const renderOrderItem = ({ item }) => (
    <OrderItem
      item={item}
      useRealApi={useRealApi}
      onUpdateStatus={onUpdateStatus}
      onShowPreview={onShowPreview}
      onPrint={onPrint}
    />
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Icon name="receipt" size={60} color="#ccc" />
      <Text style={styles.emptyText}>
        {searchQuery ? 'No orders found' : 'No orders yet'}
      </Text>
      {searchQuery && (
        <TouchableOpacity 
          style={styles.clearSearchButton}
          onPress={() => setSearchQuery('')}
        >
          <Text style={styles.clearSearchText}>Clear Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.screenContainer}>
      {/* Search and Filters */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer, order #, table..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={onShowFilters}
        >
          <Icon name="filter" size={20} color="#2196f3" />
        </TouchableOpacity>
      </View>
      
      {/* Mode Indicator */}
      {!useRealApi && (
        <View style={styles.demoIndicator}>
          <Icon name="warning" size={14} color="#ff9800" />
          <Text style={styles.demoIndicatorText}>Demo Mode - Using Dummy Data</Text>
        </View>
      )}
      
      {/* Orders Count */}
      <View style={styles.ordersInfo}>
        <Text style={styles.ordersCount}>
          {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
          {statusFilter !== 'all' && ` (${statusFilter})`}
        </Text>
      </View>
      
      {/* Orders List */}
      {isLoadingOrders && !refreshing ? (
        <ActivityIndicator size="large" style={styles.loader} color="#2196f3" />
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.ordersList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#2196f3']}
              tintColor="#2196f3"
            />
          }
          ListEmptyComponent={renderEmptyComponent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    alignItems: 'center',
    gap: 10,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },
  filterButton: {
    padding: 10,
  },
  demoIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff3e0',
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  demoIndicatorText: {
    fontSize: 12,
    color: '#e65100',
    fontWeight: '500',
  },
  ordersInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'white',
  },
  ordersCount: {
    fontSize: 14,
    color: '#666',
  },
  loader: {
    marginTop: 50,
  },
  ordersList: {
    padding: 15,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  clearSearchButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2196f3',
    borderRadius: 8,
  },
  clearSearchText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default OrdersScreen;